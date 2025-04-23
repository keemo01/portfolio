import random
import string
from locust import HttpUser, task, between, tag

def rand_text(n):
    return "".join(random.choices(string.ascii_letters + " ", k=n)).strip()

COINS = ["BTC", "ETH", "ADA", "SOL", "DOT", "XRP"]

#
# BLOG + USER 
#
@tag("blogs")
class BlogUser(HttpUser):
    host = "http://127.0.0.1:8000"
    wait_time = between(1, 3)

    def on_start(self):
        # 1) login
        r = self.client.post(
            "/api/auth/login/",
            json={"username": "locust1", "password": "LocustPass1"},
            name="POST /api/auth/login/"
        )
        if r.status_code == 200:
            token = r.json()["access"]
            self.headers = {"Authorization": f"Bearer {token}"}
            me = r.json().get("user", {})
            self.user_id = me.get("id", 1)
            self.other_user_id = self.user_id + 1
        else:
            self.headers = {}
            self.other_user_id = None

        # 2) get blogs
        resp = self.client.get(
            "/api/blogs/",
            headers=self.headers,
            name="GET /api/blogs/"
        )
        self.blog_ids = [b["id"] for b in (resp.json() if resp.status_code == 200 else [])]

    @task(3)
    def list_blogs(self):
        self.client.get("/api/blogs/", headers=self.headers, name="GET /api/blogs/")

    @task(2)
    def view_blog(self):
        if not self.blog_ids:
            return
        bid = random.choice(self.blog_ids)
        self.client.get(f"/api/blogs/{bid}/", headers=self.headers, name="GET /api/blogs/[id]/")

    @task(1)
    def post_and_delete_blog(self):
        title, content = rand_text(10), rand_text(100)
        r = self.client.post(
            "/api/blogs/create/",
            data={"title": title, "content": content},
            headers=self.headers,
            name="POST /api/blogs/create/"
        )
        if r.status_code == 201:
            nid = r.json().get("id")
            self.client.delete(
                f"/api/blogs/delete/{nid}/",
                headers=self.headers,
                name="DELETE /api/blogs/delete/[id]/"
            )

    @task(2)
    def comments_and_likes(self):
        if not self.blog_ids:
            return
        bid = random.choice(self.blog_ids)

        # get comments
        self.client.get(
            f"/api/blogs/{bid}/comments/",
            headers=self.headers,
            name="GET /api/blogs/[id]/comments/"
        )

        # post comment
        c = rand_text(50)
        pr = self.client.post(
            f"/api/blogs/{bid}/comments/",
            json={"content": c},
            headers=self.headers,
            name="POST /api/blogs/[id]/comments/"
        )
        if pr.status_code == 201:
            cid = pr.json().get("id")
            self.client.delete(
                f"/api/comments/{cid}/",
                headers=self.headers,
                name="DELETE /api/comments/[id]/"
            )

        # like and count
        self.client.post(
            f"/api/blogs/{bid}/like/",
            headers=self.headers,
            name="POST /api/blogs/[id]/like/"
        )
        self.client.get(
            f"/api/blogs/{bid}/like/count/",
            headers=self.headers,
            name="GET /api/blogs/[id]/like/count/"
        )

    @task(2)
    def bookmarks(self):
        if not self.blog_ids:
            return
        bid = random.choice(self.blog_ids)
        self.client.post(
            f"/api/add-bookmark/{bid}/",
            headers=self.headers,
            name="POST /api/add-bookmark/[id]/"
        )
        self.client.get(
            "/api/user-bookmarks/",
            headers=self.headers,
            name="GET /api/user-bookmarks/"
        )
        self.client.delete(
            f"/api/remove-bookmark/{bid}/",
            headers=self.headers,
            name="DELETE /api/remove-bookmark/[id]/"
        )

    @task(2)
    def follow_flow(self):
        if not self.other_user_id:
            return
        self.client.post(
            f"/api/follow/{self.other_user_id}/",
            headers=self.headers,
            name="POST /api/follow/[user]/"
        )
        self.client.post(
            f"/api/unfollow/{self.other_user_id}/",
            headers=self.headers,
            name="POST /api/unfollow/[user]/"
        )
        self.client.get(
            f"/api/user/{self.other_user_id}/followers/",
            headers=self.headers,
            name="GET /api/user/[user]/followers/"
        )
        self.client.get(
            f"/api/user/{self.other_user_id}/posts/",
            headers=self.headers,
            name="GET /api/user/[user]/posts/"
        )

    @task(2)
    def public_profiles(self):
        term = rand_text(3)
        self.client.get(
            f"/api/user/profile/{self.other_user_id}/",
            headers=self.headers,
            name="GET /api/user/profile/[id]/"
        )
        self.client.get(
            f"/api/user/{self.other_user_id}/posts/",
            headers=self.headers,
            name="GET /api/user/[id]/posts/"
            )


#
# PORTFOLIO FLOWS
#
@tag("portfolio")
class PortfolioUser(HttpUser):
    host = "http://127.0.0.1:8000"
    wait_time = between(1, 3)

    def on_start(self):
        # 1) login
        r = self.client.post(
            "/api/auth/login/",
            json={"username": "locust1", "password": "LocustPass1"},
            name="POST /api/auth/login/"
        )
        if r.status_code == 200:
            token = r.json()["access"]
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(5)
    def get_portfolio(self):
        self.client.get(
            "/api/portfolio/",
            headers=self.headers,
            name="GET /api/portfolio/"
        )

    @task(3)
    def add_holding(self):
        coin = random.choice(COINS)
        payload = {
            "coin": coin,
            "amount": f"{random.uniform(0.01, 0.5):.4f}",
            "purchase_price": f"{random.uniform(10, 50000):.2f}"
        }
        self.client.post(
            "/api/portfolio/add/",
            json=payload,
            headers=self.headers,
            name="POST /api/portfolio/add/"
        )

    @task(2)
    def get_history(self):
        days = random.choice([7, 14, 30])
        self.client.get(
            f"/api/portfolio/history/?days={days}",
            headers=self.headers,
            name="GET /api/portfolio/history/"
        )

    @task(1)
    def manage_keys(self):
        # GET API keys
        self.client.get(
            "/api/profile/api-keys/",
            headers=self.headers,
            name="GET /profile/api-keys/"
        )
        # POST new keys (examples here as placeholders)
        self.client.post(
            "/api/profile/api-keys/",
            json={
                "exchange": "binance",
                "binance_api_key": "ABC",
                "binance_secret_key": "DEF"
            },
            headers=self.headers,
            name="POST /profile/api-keys/"
        )
        # DELETE keys
        self.client.delete(
            "/api/profile/api-keys/",
            json={"exchange": "binance"},
            headers=self.headers,
            name="DELETE /profile/api-keys/"
        )
