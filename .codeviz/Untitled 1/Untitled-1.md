# Unnamed CodeViz Diagram

```mermaid
graph TD

    base.cv::end_user["**End User**<br>[External]"]
    base.cv::mysql_db["**MySQL Database**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\pyproject.toml `pymysql`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\pyproject.toml `mysqlclient`"]
    subgraph base.cv::crm_back["**CRM Backend**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\pyproject.toml `name`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `FROM python`"]
        subgraph base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"]
            base.cv::crm_back_api_routes["**API Routes**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\auth.py `login_user`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\customer.py `get_customers`"]
            base.cv::crm_back_api_services["**Business Logic Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\services\customer_service.py `get_all_customers`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\services\recommendation_service.py `get_recommendations`"]
            base.cv::crm_back_api_models["**Data Models**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\models\customer.py `Customer`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\models\user.py `User`"]
            base.cv::crm_back_api_ia_services["**AI/ML Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\ia\churn_model\churn_model.pkl `rb`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\ia\segments\kmeans_model.pkl `rb`"]
            %% Edges at this level (grouped by source)
            base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"] -->|"Calls"| base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"]
            base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"] -->|"Reads from and Writes to"| base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"]
            base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"] -->|"Reads from"| base.cv::crm_back_api["**CRM API**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\Dockerfile `gunicorn`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\run.py `create_app`"]
        end
    end
    subgraph base.cv::crm_front["**CRM Frontend**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\package.json `name`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\vite.config.js `defineConfig`"]
        subgraph base.cv::crm_front_webapp["**Web Application**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\package.json `react`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\index.html `<div id="root"></div>`"]
            base.cv::crm_front_webapp_components["**UI Components**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\customers\CustomerList.jsx `CustomerList`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\auth\Login.jsx `Login`"]
            base.cv::crm_front_webapp_router["**Router**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\App.jsx `<BrowserRouter>`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\main.jsx `App`"]
            base.cv::crm_front_webapp_stores["**State Management**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\stores\CustomerStore.js `create`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\stores\UserStore.js `create`"]
            base.cv::crm_front_webapp_api_services["**API Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\auth\authApiService.js `login`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\customer\customerApiService.js `getAllCustomers`"]
            base.cv::crm_front_webapp_config["**Configuration**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\config\config.js `API_BASE_URL`"]
            %% Edges at this level (grouped by source)
            base.cv::crm_front_webapp_router["**Router**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\App.jsx `<BrowserRouter>`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\main.jsx `App`"] -->|"Renders"| base.cv::crm_front_webapp_components["**UI Components**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\customers\CustomerList.jsx `CustomerList`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\auth\Login.jsx `Login`"]
            base.cv::crm_front_webapp_components["**UI Components**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\customers\CustomerList.jsx `CustomerList`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\auth\Login.jsx `Login`"] -->|"Uses / Updates"| base.cv::crm_front_webapp_stores["**State Management**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\stores\CustomerStore.js `create`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\stores\UserStore.js `create`"]
            base.cv::crm_front_webapp_components["**UI Components**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\customers\CustomerList.jsx `CustomerList`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\components\auth\Login.jsx `Login`"] -->|"Calls"| base.cv::crm_front_webapp_api_services["**API Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\auth\authApiService.js `login`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\customer\customerApiService.js `getAllCustomers`"]
            base.cv::crm_front_webapp_api_services["**API Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\auth\authApiService.js `login`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\customer\customerApiService.js `getAllCustomers`"] -->|"Uses"| base.cv::crm_front_webapp_config["**Configuration**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\config\config.js `API_BASE_URL`"]
        end
    end
    %% Edges at this level (grouped by source)
    base.cv::end_user["**End User**<br>[External]"] -->|"Uses"| base.cv::crm_front_webapp["**Web Application**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\package.json `react`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\index.html `<div id="root"></div>`"]
    base.cv::end_user["**End User**<br>[External]"] -->|"Uses"| base.cv::crm_front_webapp_router["**Router**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\App.jsx `<BrowserRouter>`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\main.jsx `App`"]
    base.cv::crm_front_webapp["**Web Application**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\package.json `react`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\index.html `<div id="root"></div>`"] -->|"Consumes API from"| base.cv::crm_back_api_routes["**API Routes**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\auth.py `login_user`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\customer.py `get_customers`"]
    base.cv::crm_back_api_models["**Data Models**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\models\customer.py `Customer`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\models\user.py `User`"] -->|"Reads from and writes to"| base.cv::mysql_db["**MySQL Database**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\pyproject.toml `pymysql`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\pyproject.toml `mysqlclient`"]
    base.cv::crm_front_webapp_api_services["**API Services**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\auth\authApiService.js `login`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Front\src\services\customer\customerApiService.js `getAllCustomers`"] -->|"Consumes API from"| base.cv::crm_back_api_routes["**API Routes**<br>c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\auth.py `login_user`, c:\Users\Sr. Sebastian\Desktop\TESIS\CRM-Back\app\routes\customer.py `get_customers`"]

```
---
*Generated by [CodeViz.ai](https://codeviz.ai) on 7/10/2026, 18:22:45*
