#!/bin/bash
# APEX COMFYUI SETUP — RunPod L4 GPU
# Paste this into RunPod terminal after starting pod 995b6zjkubz8h5
# Usage: curl -sL https://raw.githubusercontent.com/kawal393/digital-gallowsapex-infrastructurecom/main/scripts/setup_comfyui.sh | bash

set -e
echo "═══ APEX COMFYUI INSTALLER ═══"

# 1. Install ComfyUI
cd /workspace
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# 2. Install custom nodes
cd custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
git clone https://github.com/rgthree/rgthree-comfy.git
git clone https://github.com/WASasquatch/was-node-suite-comfyui.git
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git
git clone https://github.com/SeargeDP/SeargeSDXL.git
cd ..

# 3. Download base models
cd models/checkpoints
wget -q --show-progress https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
wget -q --show-progress https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
cd ../..

# 4. Download LoRAs for FWAT characters
cd models/loras
# Character LoRAs for Rajveer, Jennifer, Michael, Shaun, Scarred Face
mkdir -p fwat
cd fwat
# Uncomment and add URLs when LoRAs are trained:
# wget -q --show-progress <rajveer_lora_url>
# wget -q --show-progress <jennifer_lora_url>
# wget -q --show-progress <michael_lora_url>
# wget -q --show-progress <shaun_lora_url>
# wget -q --show-progress <scarred_face_lora_url>
cd ../../../..

# 5. Create startup script
cat > start_comfyui.sh << 'EOF'
#!/bin/bash
cd /workspace/ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
EOF
chmod +x start_comfyui.sh

# 6. Print access info
echo ""
echo "═══ COMFYUI INSTALLED ═══"
echo "  Start:    cd /workspace/ComfyUI && python main.py --listen 0.0.0.0 --port 8188"
echo "  Port:     8188 (expose in RunPod settings)"
echo "  Models:   SD1.5 + SDXL base loaded"
echo "  LoRAs:    FWAT dir ready at models/loras/fwat/"
echo "  Manager:  http://<pod-ip>:8188 (install custom nodes via UI)"
echo "═══════════════════════════"
