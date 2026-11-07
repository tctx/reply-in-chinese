# Reply in Chinese

By **Technical Patriots of America (TPA)**

A Chrome extension for X. It adds a **中** button to every post. Click it and it reads the post, asks OpenAI for a satirical reply aimed at that post, opens the reply box, and types it in. The reply is written as an over-the-top Communist Party cheerleader thanking the official for helping China beat America.

You read it and press Post yourself. Nothing posts automatically.

## Install
1. Download or clone this repo
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and pick this folder
5. Click the extension icon and paste your OpenAI API key

## Settings (click the toolbar icon)
- **Reply language:** Chinese only (default), Chinese + English, or English only
- **Model:** defaults to `gpt-5.5`
- **OpenAI API key:** required. It's kept in your browser's local extension storage and only sent to `api.openai.com`.

## Button states
- **中**: ready
- **…**: writing
- **!**: error. Hover over it to see why. Posts that aren't about policy are skipped.

## Rules built into the prompt
- The satire targets the policy, not Chinese people: no slurs or ethnic stereotypes.
- No factual accusations about the official (no "paid by Beijing").
- No threats or violence.

See `prompt.js` to change the tone.

## Files
- `content.js`: adds the button, reads the post, fills the reply box
- `background.js`: calls OpenAI
- `prompt.js`: the satire prompt and its rules
- `options.html` / `options.js`: settings
