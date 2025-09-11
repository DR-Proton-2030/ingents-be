import axios from 'axios';
import { MAIL_SERVER_URL } from '../../config/config';

export const callMailServer = async (url: string, data: any, headers: any = {}) => {
	try {
		console.log("===> Calling Mail Server API <===");
		console.log("URL:", `${MAIL_SERVER_URL}/api/email/notification/${url}`);
		const response = await axios.post(`${MAIL_SERVER_URL}/api/email/notification/${url}`, data, { headers });
		console.log("==<Mail Server Response======>", response)
		return response.data;
	} catch (error) {
		console.error('Error calling POST API:', error);
		throw error;
	}
}