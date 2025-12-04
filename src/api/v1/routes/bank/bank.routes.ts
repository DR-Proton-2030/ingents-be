import express from "express";
import { createConsent, getBankData } from "../../../../services/bank/bank.service";

const bankRouter = express.Router();

bankRouter.get("/create-consent", async (req, res) => {
  try {
    const data = await createConsent();
    res.json(data);
  } catch (err:any) {
    res.status(500).json({ error: err?.response?.data || err.message });
  }
});

bankRouter.get("/fetch-bank/:consentId", async (req, res) => {
  try {
    const consentId = req.params.consentId as string;
    const data = await getBankData(consentId);
    res.json(data);
  } catch (err:any) {
    res.status(500).json({ error: err?.response?.data || err.message });
  }
});

export default bankRouter;
