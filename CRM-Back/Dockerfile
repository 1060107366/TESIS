FROM python:3.13

WORKDIR /app
COPY . /app

RUN pip install poetry
RUN poetry install

CMD ["poetry", "run", "gunicorn", "app:create_app()"]