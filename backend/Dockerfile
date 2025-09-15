FROM python:3.11-slim

WORKDIR /app

# Configure pip to handle SSL issues
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]