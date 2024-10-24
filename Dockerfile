FROM node:18-slim

# Establecer variables de entorno para el timezone
ENV TZ=America/Bogota
# Configurar la zona horaria
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Establecer el directorio de trabajo en el contenedor
WORKDIR /myapp

# Copiar solo los archivos de dependencias primero
COPY package.json package-lock.json* ./

# Para dev
RUN npm install 
# para prod comenta la linea anterior y descomenta la inferior
#RUN npm install --only=production

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto que usa la aplicación
EXPOSE 3000

# Para dev
CMD npm run dev
# Para prod CMD ["npm", "start"]