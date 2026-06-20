import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

import { config } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { salonRouter } from "./routes/salon.routes";
import { bookingRouter } from "./routes/booking.routes";
import { glamaiRouter } from "./routes/glamai.routes";
import { uploadRouter } from "./routes/upload.routes";

const app = express();

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/salons", salonRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/glamai", glamaiRouter);
app.use("/api/uploads", uploadRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Backend] Server running on port ${PORT}`);
  console.log(`[Backend] Environment: ${config.nodeEnv}`);
});

export default app;
