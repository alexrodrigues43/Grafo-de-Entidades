#!/usr/bin/env bash
# Script de Deploy Automatizado para o Google Cloud Run (Semântico Graph Studio)
# Baseado no padrão de produção do QRG Auditor e playbook cloud-run-domain-and-rbac
# Uso: ./deploy_cloud_run.sh [PROJECT_ID] [REGION]

set -e

# Validar se o gcloud CLI está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Erro: O Google Cloud CLI ('gcloud') não está instalado nesta máquina."
  echo ""
  echo "👉 Para instalar no Ubuntu com um único comando, execute:"
  echo "   sudo snap install google-cloud-cli --classic"
  echo ""
  echo "👉 Depois de instalado, autentique-se com sua conta Google:"
  echo "   gcloud auth login"
  echo ""
  echo "👉 Em seguida, rode este script novamente:"
  echo "   ./deploy_cloud_run.sh <SEU_PROJECT_ID>"
  exit 1
fi

PROJECT_ID=${1:-"blogsemantico-1750525854725"}
REGION=${2:-"us-central1"}
SERVICE_NAME="semantico-graph-studio"
CUSTOM_DOMAIN="grafos.semantico.com.br"

echo "🚀 Iniciando deploy do '$SERVICE_NAME' no Google Cloud Run..."
echo "👉 Projeto: $PROJECT_ID"
echo "👉 Região:  $REGION"

# 1. Obter variáveis e credenciais do .env de forma segura
API_KEY_FROM_ENV=""
if [ -f .env ]; then
  API_KEY_FROM_ENV=$(grep "^GEMINI_API_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi
API_KEY=${GEMINI_API_KEY:-${API_KEY_FROM_ENV}}

trap 'rm -f env.yaml' EXIT

cat <<EOF > env.yaml
NODE_ENV: "production"
DEFAULT_MODEL: "gemini-3.8-flash"
GEMINI_API_KEY: "$API_KEY"
ACCESS_PASSCODE: "opennre-2026"
ADMIN_EMAILS: "alexrodrigues43@gmail.com"
APP_URL: "https://$CUSTOM_DOMAIN"
EOF

IMAGE_TAG="us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME:latest"

echo ""
echo "📦 1. Compilando container com Cloud Build..."
gcloud builds submit --tag "$IMAGE_TAG" --project="$PROJECT_ID" --quiet

echo ""
echo "🚀 2. Publicando revisao no Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_TAG" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --quiet \
  --env-vars-file=env.yaml

echo ""
echo "✅ Deploy concluído com sucesso no Cloud Run!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format="value(status.url)")
echo "🌐 URL Pública do Serviço: $SERVICE_URL"

# 5. Autorização Automática no Firebase Authentication (Elimina auth/unauthorized-domain)
if [ -f "./authorize_firebase_domain.py" ] && [ -n "$SERVICE_URL" ]; then
  echo ""
  echo "🔐 Vinculando e autorizando domínio no Firebase Authentication..."
  python3 ./authorize_firebase_domain.py "$SERVICE_URL" || true
fi

echo ""
echo "📌 Para mapear seu subdomínio corporativo (ex: grafos.semantico.com.br):"
echo "1. Acesse: https://console.cloud.google.com/run/domains?project=$PROJECT_ID"
echo "2. Clique em 'Adicionar mapeamento' e aponte para o serviço '$SERVICE_NAME'."
echo "3. Se necessário, verifique a propriedade do domínio no Google Search Console."
echo "4. Crie o registro CNAME apontando seu subdomínio para: ghs.googlehosted.com."
