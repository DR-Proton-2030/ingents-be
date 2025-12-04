import axios from "axios";
import { SETU_CLIENT_ID, SETU_CLIENT_SECRET } from "../../config/config";

export const createConsent = async () => {
  const response = await axios.post(
    "https://fiu-sandbox.setu.co/v2/consents",
    {
      consentDuration: {
        unit: "MONTH",
        value: "24",
      },
      dataRange: {
        from: "2025-10-01T00:00:00Z",
        to: "2025-10-12T00:00:00Z",
      },
      fiTypes: ["DEPOSIT"],
      vua: "9999999999@onemoney",
    },
    {
      headers: {
        "x-client-id": SETU_CLIENT_ID,
        "x-client-secret": SETU_CLIENT_SECRET,
        "x-product-instance-id": "88665f38-c9d6-4b29-9b93-24fa2d4d9386",
      },
    }
  );

  return response.data;
};

export const getBankData = async (consentId: string) => {
  const response = await axios.get(
    `https://fiu-sandbox.setu.co/v2/accounts/${consentId}`,
   {
      headers: {
        "x-client-id": SETU_CLIENT_ID,
        "x-client-secret": SETU_CLIENT_SECRET,
        "x-product-instance-id": "88665f38-c9d6-4b29-9b93-24fa2d4d9386",
      },
    }
  );

  return response.data;
};
