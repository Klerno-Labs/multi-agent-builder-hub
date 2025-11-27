import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/features", (_req, res) =>
  res.json({ projectId: "1535425e-096b-4888-8af6-b434d909581d", features: ["Responsive marketing pages","Contact / lead capture","Analytics-ready"] }),
);

export function start() {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log("API running on port", port));
}

if (require.main === module) start();
