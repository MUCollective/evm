from google_auth_oauthlib import flow

from google.cloud import bigquery

class BigQuery_client:

    client = None
    credentials = None
    project = None

    @staticmethod
    def connect(path_to_secret, gcp_project):
        launch_browser = True

        appflow = flow.InstalledAppFlow.from_client_secrets_file(
            # "./client_secret_894619897905-m57bhqk8ifsjc4o5rso6gmpp65k73cgd.apps.googleusercontent.com.json", scopes=["https://www.googleapis.com/auth/bigquery"]
            path_to_secret, scopes=["https://www.googleapis.com/auth/bigquery"]
        )

        if launch_browser:
            appflow.run_local_server()
        else:
            appflow.run_console()

        BigQuery_client.credentials = appflow.credentials

        BigQuery_client.project = gcp_project # 'evm-interaction-logs'

        BigQuery_client.client = bigquery.Client(project=BigQuery_client.project, credentials=BigQuery_client.credentials)
    

    @staticmethod
    def trans_dataframe():
        query = """
            SELECT * FROM `{}.interaction_logs.interaction_logs`
        """.format(BigQuery_client.project)
        query_results = BigQuery_client.client.query(query)

        dataframe = query_results.to_dataframe()
        return dataframe
