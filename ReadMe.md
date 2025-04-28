# Dissertation – Cryptocurrency Portfolio Tracker with Social Features

TradeSync is a full-stack web application that makes  tracking your portfolio much easier and adds social media features to help users share knowledge and insights. Built with **React (frontend)** and **Django REST Framework (backend)**, using **MariaDB** for storage and **Binance API** for live holdings.

---

## How to Run the Project

### Backend (Django)

1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Create and activate a virtual environment:
    ```bash
    python3 -m venv env
    source env/bin/activate  # For Windows: env\Scripts\activate
    ```

3. Install backend dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4. Set environment variables (create a `.env` file):
    ```
    SECRET_KEY=your-secret-key
    DATABASE_URL=your-mariadb-url
    CLOUDINARY_CLOUD_NAME=your-cloud-name
    CLOUDINARY_API_KEY=your-cloudinary-key
    CLOUDINARY_API_SECRET=your-cloudinary-secret
    ```

5. Apply migrations:
    ```bash
    python manage.py migrate
    ```

6. Run the backend server:
    ```bash
    python manage.py runserver
    ```
Backend runs at: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

### Frontend (React)

1. Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2. Install frontend dependencies:
    ```bash
    npm install
    ```

3. Start the frontend server:
    ```bash
    npm start
    ```
Frontend runs at: [http://localhost:3000/](http://localhost:3000/)

---

## Tech Stack

- **Frontend:** React.js (Firebase Hosting)
- **Backend:** Django REST Framework (Heroku)
- **Database:** MariaDB
- **Cloud Storage:** Cloudinary
- **API Integration:** Binance API
- **Authentication:** JWT-based authentication

---
## Youtube -- https://www.youtube.com/watch?si=LvNli7Myp1QieENt&v=P5pLcX_f9Ns&feature=youtu.be


## Features

- Connect Binance API to visualize holdings
- Portfolio visualizations (line, pie, and bar charts)
- Create posts, comment, like, bookmark, and follow users
- Risk metrics to monitor portfolio health
- Daily portfolio updates

---

## Future Improvements

- Real-time price updates via WebSocket
- Integration with multiple exchanges (Coinbase, Kraken)
- Native mobile application (React Native)

---

## Project Status

 MVP Completed  
 Deployed and functional  
 Ready for scaling and feature expansion

---

#  Enjoy TradeSync!

