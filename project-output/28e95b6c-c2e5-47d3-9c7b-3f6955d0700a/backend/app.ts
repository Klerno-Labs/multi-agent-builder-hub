import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/features", (_req, res) =>
  res.json({ projectId: "28e95b6c-c2e5-47d3-9c7b-3f6955d0700a", features: ["I just want it have a solid hook with a cta"] }),
);

export function start() {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log("API running on port", port));
}

if (require.main === module) start();
