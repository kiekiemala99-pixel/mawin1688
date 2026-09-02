services:
  - type: web
    name: mawin1688
    env: node
    buildCommand: npm ci && npm run build:host
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 22.23.2