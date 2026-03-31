#!/bin/sh

# Verifica se a variável de ambiente API_KEY foi passada
if [ -z "$API_KEY" ]; then
  echo "AVISO: A variável de ambiente API_KEY não foi definida!"
  echo "O aplicativo pode não funcionar corretamente."
else
  echo "Injetando API_KEY no index.html..."
  # Substitui o placeholder __VITE_GEMINI_API_KEY__ pelo valor real da API_KEY no index.html
  sed -i "s|__VITE_GEMINI_API_KEY__|${API_KEY}|g" /usr/share/nginx/html/index.html
fi

# Inicia o Nginx
exec "$@"
