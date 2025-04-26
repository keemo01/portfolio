const BASE_URL = process.env.REACT_APP_API_URL;

export async function getTrades() {
  const res = await fetch(`${BASE_URL}/api/trades/`);
  return res.json();
}