import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/features", (_req, res) =>
  res.json({ projectId: "2b5d2ee8-f1b9-4e50-888b-97bb80e16129", features: ["Responsive marketing pages","Contact / lead capture","Analytics-ready"] }),
);

export function start() {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log("API running on port", port));
}

if (require.main === module) start();
