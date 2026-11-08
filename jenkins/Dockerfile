FROM jenkins/jenkins:lts-jdk17
USER root
# Apple Silicon (M1/M2/M3): change amd64 to arm64 below
RUN apt-get update && apt-get install -y docker.io curl \
 && curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
 && install kubectl /usr/local/bin/kubectl && rm kubectl \
 && rm -rf /var/lib/apt/lists/*
USER jenkins
