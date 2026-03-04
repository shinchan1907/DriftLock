FROM python:3.11-slim-bullseye

WORKDIR /build

# Install dependencies for PyInstaller and pystray
RUN pip install pyinstaller pystray Pillow --no-cache-dir

COPY templates/agent_python.py.template ./agent.py

# Replace placeholders with build-time defaults (real values injected at download)
RUN sed -i 's/{{SERVER_URL_PADDED_TO_200_CHARS}}/DRIFTLOCK_PLACEHOLDER_SERVER_URL_REPLACE_AT_RUNTIME_PADDING_TO_200_CHARS_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/g' agent.py
RUN sed -i 's/{{API_KEY_PADDED_TO_64_CHARS}}/DRIFTLOCK_PLACEHOLDER_API_KEY_REPLACE_AT_RUNTIME_XXXXXXXXXXXXXXXXX/g' agent.py
RUN sed -i 's/{{HOSTNAME_PADDED_TO_100_CHARS}}/DRIFTLOCK_PLACEHOLDER_HOSTNAME_REPLACE_AT_RUNTIME_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/g' agent.py
RUN sed -i 's/{{CHECK_INTERVAL_PADDED_TO_6_CHARS}}/000300/g' agent.py
RUN sed -i 's/{{SERVICE_NAME_PADDED_TO_64_CHARS}}/DRIFTLOCK_PLACEHOLDER_SVCNAME_REPLACE_AT_RUNTIME_XXXXXXXXXXXXXXX/g' agent.py
RUN sed -i 's/{{AGENT_VERSION_PADDED_TO_20_CHARS}}/1.0.0               /g' agent.py

# Build the Linux binary (as proof of concept / Linux python agent)
RUN pyinstaller --onefile --name driftlock-agent --clean agent.py

CMD ["cp", "dist/driftlock-agent", "/output/driftlock-agent"]
