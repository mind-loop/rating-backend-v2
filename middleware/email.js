import axios from "axios";
import MyError from "../utils/myError.js"; // өөрийн MyError класс

const CDN_URL = process.env.CDN_URL || "https://cdn.itwork.mn/api";

export const sendHtmlEmail = async (emailBody) => {
    try {
        const response = await axios.post(`${CDN_URL}/email/html`, emailBody);
        return response.data;
    } catch (error) {
        console.error("Имэйл илгээхэд алдаа:", error.response?.data || error.message);
        throw new MyError(
            error.response?.data?.message || "Имэйл илгээхэд алдаа гарлаа",
            error.response?.status || 500
        );
    }
};
