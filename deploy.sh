#!/usr/bin/env bash
# AstroClaw 3D 一键本地/云端部署控制脚本

set -e

echo "=================================================="
echo "🚀 AstroClaw 3D 全球航天数字孪生指挥中心 — 部署控制"
echo "=================================================="

PORT=${1:-8080}

if command -v python3 &> /dev/null; then
    echo "正在本地启动常驻 HTTP 服务器 (端口 $PORT)..."
    python3 -m http.server "$PORT" &
    SERVER_PID=$!
    echo "--------------------------------------------------"
    echo "✅ 服务已成功运行在后台!"
    echo "🔗 本地访问地址: http://localhost:$PORT"
    echo "📌 进程 PID: $SERVER_PID"
    echo "--------------------------------------------------"
else
    echo "❌ 未检测到 Python3 环境，请双击打开 index.html 网页即可运行。"
fi
