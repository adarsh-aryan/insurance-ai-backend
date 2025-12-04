import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { SYSTEM_PROMPT } from "./instructions/sys_prompt.js";
import { TOOLS } from "./instructions/tools.js";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
app.use(cors()); // allow all origins
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Store connected users by email or userId
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("connected",socket.id)
  connectedUsers.set(1, socket.id); // for testing store the socket id for each user connection individually
  socket.on("disconnect", () => {
    console.log(`socket disconnected ${socket.id}`);
  });
});

// ===============================
// 🔑 Generate ephemeral OpenAI token
// ===============================
app.get("/token", async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const sessionConfig = {
    session: {
      type: "realtime",
      model: "gpt-realtime",
      instructions: SYSTEM_PROMPT,
      tools: TOOLS,
      output_modalities: ["text"],
      audio: {
        output: { voice: "marin" },
        input: {
          transcription: {
            model: "gpt-4o-transcribe",
            prompt: "Transcribe the audio",
          },
          noise_reduction: {
            type: "near_field",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.7,
            silence_duration_ms: 500,
          },
        },
      },
    },
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/realtime/client_secrets",
      sessionConfig,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Error generating ephemeral token:", err.message);
    return res.status(500).json({ error: "Failed to generate token" });
  }
});

app.post("/claim", async (req, res) => {
  const claim_data = req.body;

  const claimsDir = path.resolve("claims");
  await fs.mkdir(claimsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(claimsDir, `claim_${timestamp}.json`);

  claim_data.created_at = new Date().toISOString();

  await fs.writeFile(filename, JSON.stringify(claim_data, null, 4), "utf-8");

  return res.send({ claim_initiate: true });
});

// generate quote for vehicle (car,bike)
app.post("/quote", async (req, res) => {
  const vehcile_info = req.body;
  // generate the quote for this vehicle
  console.log("vehicle info", vehcile_info);

  const quotes = {
    quotes: [
      {
        quote_id: uuidv4(),
        plan_name: "Basic Plan",
        coverage_type: "Third-Party Only",
        add_ons_included: [],
        premium_amount: 3200,
        estimated_idv: 400000,
        description:
          "Third-party liability coverage as per Motor Vehicles Act.",
      },
      {
        quote_id: uuidv4(),
        plan_name: "Standard Plan",
        coverage_type: "Comprehensive",
        add_ons_included: ["Zero Depreciation"],
        premium_amount: 5800,
        estimated_idv: 420000,
        description: "Covers own damage and third-party with basic add-ons.",
      },
      {
        quote_id: uuidv4(),
        plan_name: "Premium Plan",
        coverage_type: "Comprehensive",
        add_ons_included: [
          "Zero Depreciation",
          "Roadside Assistance",
          "Engine Protect",
          "Personal Accident Cover",
        ],
        premium_amount: 7600,
        estimated_idv: 440000,
        description:
          "All-inclusive coverage with full add-ons and maximum protection.",
      },
    ],
    currency: "INR",
  };

  return res.json(quotes);
});

app.post("/generate-payment-link", (req, res) => {
  const { quote_id, premium_amount } = req.body;

  console.log("quote id", quote_id);
  console.log("premium amount", premium_amount);

  // create the payment initiate transaction were created for this request (to be continue)

  const payment_link_info = {
    payment_id: uuidv4(),
    quot_id: quote_id,
    payment_link: "https://sandbox.razorpay.com/pay/abc123",
    qr_code_url: "https://sandbox.razorpay.com/qrcode/abc123.png",
    amount: premium_amount,
    currency: "INR",
    status: "pending",
  };

  return res.json(payment_link_info);
});

// probably call through webhook by payment provider
app.post("/payment-callback", (req, res) => {

  const payment_info = req.body;
  if(!payment_info) return res.status(400).send("payment info not defined")
  const payment_id = payment_info.payment_id;
  const status = payment_info.status;

  // update the payment transaction status with this payment id
  // if payment gets succeded generate the policy number (save the policy in db from the quote its selected), send back to client
  // if payment gets failed return failed payment status to client

  // if payment becomes successfull emit an event payment success for this payment user (who made the payment of this policy)
  // for testing user_id-1
  const user_id=1
  const socket_id = connectedUsers.get(user_id);
  if (socket_id) {
    io.to(socket_id).emit("payment_success", {
      message: "✅ Payment successful for payment! Your policy is being issued.",
      payment_id: payment_id,
      status: status,
      policy_number:uuidv4()
    });
    console.log(`Notified ${user_id} for payment ${payment_id}`);
  }
  return res.json({
    payment_id: payment_id,
    status: status,
    policy_number: uuidv4(),
  });
});

app.get("/claim/status", async (req, res) => {
  const { policy_number } = req.query;
  console.log("query params", req.query);
  if (!policy_number)
    return res.status(400).send({ error: "please provide a policy number" });

  console.log("policy_number", policy_number);

  return res.send({ claim_status: "pending" });
});

// ===============================
// 🟢 Start the server
// ===============================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
