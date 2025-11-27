import os
import sys
import subprocess
from openai import OpenAI

# ==========================================
# CONFIGURATION
# ==========================================
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please set it or paste your key into the script.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

# Directory to save video specs/placeholders
VIDEO_DIR = "assets/videos"
if not os.path.exists(VIDEO_DIR):
    os.makedirs(VIDEO_DIR)

# ==========================================
# NOVA'S SYSTEM PROMPT
# ==========================================
NOVA_SYSTEM_PROMPT = """
You are **Nova**, the Video Creator.

YOUR MISSION
- Design and specify any videos needed (intros, explainers, background loops, etc.).
- You are the Director of Photography and Screenwriter.

INPUTS
- `DesignSpec` from Ava.
- Video-related `WorkPackages`.

OUTPUTS
- For each video:
  - **File Name:** (e.g., `hero-loop.mp4`)
  - **Type:** (Background Loop, Explainer, Intro, Interaction Micro-animation)
  - **Duration:** (Keep loops under 10s, Explainers under 60s)
  - **Script/Storyboard:** A shot-by-shot breakdown.
  - **AI Prompts:** Detailed text-to-video prompts (optimized for Sora, Runway Gen-2, or Pika).

BEHAVIOR
1. PERFORMANCE FIRST
   - Web video is heavy. Prioritize "abstract loops" that compress well for backgrounds.
   - For Explainers, script them to be concise.

2. VIBE CHECK
   - Align with the `DesignSpec` (colors, mood).
   - If the site is "Minimalist", do not suggest chaotic action cuts.

3. FORMATTING
   - Output clear Markdown tables for the storyboard.
   - Separate the "Prompt" clearly so the user can copy-paste it into a video generator.
"""


# ==========================================
# AGENT CLASS
# ==========================================
class NovaAgent:
    def __init__(self):
        self.messages = [
            {"role": "system", "content": NOVA_SYSTEM_PROMPT}
        ]

    def generate_video_spec(self, design_spec, task):
        """Generates the storyboard and prompts."""
        user_content = (
            f"CONTEXT (DESIGN SPEC):\n{design_spec}\n\n"
            f"TASK:\n{task}\n\n"
            "Please provide the Storyboard, Duration, and AI Prompts for this video."
        )

        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Nova]: Visualizing scenes and writing the screenplay...")
            completion = client.chat.completions.create(
                model="gpt-4o", 
                messages=self.messages,
                temperature=0.7 
            )

            response_text = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": response_text})
            return response_text

        except Exception as e:
            return f"Error communicating with Nova: {e}"

    def create_placeholder(self, filename, duration_sec=5, color="black", text="Placeholder"):
        """Uses FFMPEG to create a lightweight placeholder video for the frontend dev."""
        filepath = os.path.join(VIDEO_DIR, filename)
        if not filepath.endswith(".mp4"):
            filepath += ".mp4"

        # Request approval before invoking external ffmpeg process
        try:
            from agents.utils.api_clients import request_tool_approval, poll_tool_approval
            next_base = os.environ.get("NEXT_BASE_URL", "http://localhost:3000")
            req_id = request_tool_approval(next_base, "Nova", "ffmpeg", "generate_placeholder", {"filename": filepath, "duration": duration_sec}, timeout=10)
            approved = False
            if req_id:
                result = poll_tool_approval(next_base, req_id, poll_interval=1.0, timeout=30)
                if result and result.get("approved") is True:
                    approved = True
            if not approved:
                return "[System]: Operation cancelled — user approval not granted for running ffmpeg."
        except Exception:
            # If approval API not available, proceed but still check for ffmpeg
            approved = True

        # Check for ffmpeg
        try:
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            return "[System]: 'ffmpeg' not installed. Cannot generate placeholder file. (Install ffmpeg to enable this)."

        print(f"[Nova]: Generating placeholder video '{filepath}'...")

        # Ensure duration is a string/number ffmpeg accepts
        try:
            duration_str = str(int(duration_sec))
        except ValueError:
            duration_str = "5"

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c={color}:s=1280x720:d={duration_str}",
            "-vf", f"drawtext=text='{text}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=(h-text_h)/2",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            filepath
        ]

        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"SUCCESS: Created placeholder '{filepath}' ({duration_str}s, {color})."
        except Exception as e:
            return f"FAILED to create placeholder: {e}"


# ==========================================
# HELPER: MULTI-LINE INPUT
# ==========================================
def get_multiline_input(instruction):
    print(f"\n{instruction}")
    print("(Type 'DONE' on a new line and press Enter when finished)")
    lines = []
    while True:
        line = input()
        if line.strip() == 'DONE':
            break
        lines.append(line)
    return "\n".join(lines)


# ==========================================
# MAIN EXECUTION LOOP
# ==========================================
def main():
    print("\n--- INITIALIZING NOVA: THE VIDEO CREATOR ---\n")
    agent = NovaAgent()

    # 1. Load Design Spec
    print("Nova: I need the Design Spec to match the visual mood.")
    design_spec = ""
    if os.path.exists("DesignSpec.md"):
        with open("DesignSpec.md", "r") as f:
            design_spec = f.read()
        print(f"      [System]: Loaded DesignSpec.md")
    else:
        design_spec = get_multiline_input("Nova: 'DesignSpec.md' not found. Paste it below:")

    if not design_spec.strip():
        print("Error: No spec provided. Exiting.")
        return

    # 2. Define Task
    print("\nNova: What video asset do we need?")
    print("      (e.g., 'Hero Background Loop', '30s Product Explainer', 'Loading Animation')")
    task = input("Task: ").strip()
    if not task:
        task = "Hero Background Loop (Abstract, tech vibe)"

    # 3. Generate Spec/Storyboard
    response = agent.generate_video_spec(design_spec, task)

    print("\n" + "="*40)
    print(" VIDEO STORYBOARD & PROMPTS ")
    print("="*40 + "\n")
    print(response)

    # 4. Save Spec
    spec_filename = f"VideoSpec_{task.replace(' ', '_')[:15]}.md"
    with open(spec_filename, "w") as f:
        f.write(response)
    print(f"\n[System]: Storyboard saved to '{spec_filename}'.")

    # 5. Offer Placeholder Generation
    print("\nNova: Would you like a PLACEHOLDER .mp4 file for Liam (Frontend) to use right now?")
    gen_ph = input("      (y/n): ").strip().lower()

    if gen_ph == 'y':
        print("      > Enter filename (e.g. hero-bg):")
        ph_name = input("        Name: ").strip() or "video_placeholder"
        print("      > Enter duration in seconds (e.g. 10):")
        ph_dur = input("        Duration: ").strip() or "5"
        print("      > Enter background color (e.g. blue, black, red):")
        ph_col = input("        Color: ").strip() or "black"

        result = agent.create_placeholder(ph_name, duration_sec=ph_dur, color=ph_col, text=f"PLACEHOLDER: {task}")
        print(f"\n{result}")


if __name__ == "__main__":
    main()
