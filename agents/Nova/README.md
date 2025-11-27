# Nova – Video Creator Agent

Nova designs and specifies all video assets needed for your project.

It can:
- Read your `DesignSpec.md`
- Generate storyboards, durations, and AI prompts for tools like Sora/Runway/Pika
- Optionally create lightweight placeholder `.mp4` files using `ffmpeg` for frontend integration

## Setup

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
```

Make sure `ffmpeg` is installed and available on your PATH if you want placeholder videos.

## Run

```bash
python nova_agent.py
```
