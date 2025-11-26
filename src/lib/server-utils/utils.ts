import axios from "axios";

const base = process.env.NEXT_PUBLIC_SWAGGER_API_BASE_URL;
const version = process.env.NEXT_PUBLIC_SWAGGER_API_VERSION;

// Build Swagger base URL safely
const SWAGGER_API_URL =
  base && version ? `${base.replace(/\/$/, "")}/${version}` : null;

if (!SWAGGER_API_URL) {
  throw new Error(
    "Swagger API URL is not configured. Check NEXT_PUBLIC_SWAGGER_API_BASE_URL and NEXT_PUBLIC_SWAGGER_API_VERSION in your environment files."
  );
}

// Basic Auth (for swagger access)
const authHeader = `Basic ${Buffer.from("admin:heyoo!").toString("base64")}`;

// Axios instance
const apiClient = axios.create({
  baseURL: SWAGGER_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: authHeader,
  },
});

// Handle API errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
