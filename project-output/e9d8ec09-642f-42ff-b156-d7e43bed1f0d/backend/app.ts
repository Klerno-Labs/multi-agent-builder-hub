import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/features", (_req, res) =>
  res.json({ projectId: "e9d8ec09-642f-42ff-b156-d7e43bed1f0d", features: ["Responsive marketing pages","Contact / lead capture","Analytics-ready"] }),
);

export function start() {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log("API running on port", port));
}

if (require.main === module) start();
