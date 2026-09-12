require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const documentTypeRoutes = require("./routes/documentTypes");
const userRoutes = require("./routes/users");
const reportRoutes = require("./routes/reports");
const notificationRoutes = require("./routes/notifications");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "smart-barangay-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/document-types", documentTypeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found." }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Barangay API running on http://localhost:${PORT}`);
});
