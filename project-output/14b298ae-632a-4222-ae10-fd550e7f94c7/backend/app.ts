import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/features", (_req, res) =>
  res.json({ projectId: "14b298ae-632a-4222-ae10-fd550e7f94c7", features: ["I want the hearing aids as the center of attention ."] }),
);

export function start() {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log("API running on port", port));
}

if (require.main === module) start();
