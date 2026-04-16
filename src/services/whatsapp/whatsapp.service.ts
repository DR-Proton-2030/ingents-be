import axios from "axios";

export const sendWhatsappMessage = async (
  phoneNumberId: string,
  accessToken: string,
  toPhoneNumber: string,
  messageContent: string
) => {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhoneNumber,
    type: "text",
    text: {
      preview_url: false,
      body: messageContent,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error sending WhatsApp to ${toPhoneNumber}:`, error.response?.data || error.message);
    throw error;
  }
};
