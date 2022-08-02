from flask import Flask, request
from flask_cors import CORS
import json
import argparse

from module.connect import BigQuery_client

app = Flask(__name__)
CORS(app)



@app.route('/')
def check_access():
    return 'EVM-interaction-logs-collect API'


@app.route('/add', methods=['POST'])
def add_log():
    body = json.loads(request.data.decode('utf-8'))

    def structify(field):
        if isinstance(field, dict):
            struct_field = ()
            for value in field.values():
                struct_field += (structify(value), )
        elif isinstance(field, list):
            struct_field = []
            for value in field:
                struct_field.append(structify(value))
        else:
            struct_field = field
        return struct_field
    
    def datetimify(field):
        datetime_field = ()
        for value in field.values():
            datetime_field += (value, )
        return 'DATETIME' + str(datetime_field)

    query = """
        INSERT `evm-interaction-logs.interaction_logs.interaction_logs`
        VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})
    """.format('"' + body['userId'] + '"',
        datetimify(body['time']),
        '"' + body['datasetName'] + '"', 
        body['modelChecking'], 
        body['modeling'], 
        '"' + str(body['vlSpec']) + '"', 
        str(structify(body['dndState'])).replace("[]", "ARRAY<STRUCT<INT64, INT64, STRING, STRING, BOOLEAN>>[]"), 
        structify(body['filters']),
        structify(body['transformations']), 
        structify(body['models']), 
        '"' + body['showPredictionOrResidual'] + '"',
        '"' + body['info'] + '"')
    query_results = BigQuery_client.client.query(query)
    print(body['info'])
    return {'success': True, 'info': ''}



if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Run the backend.')

    parser.add_argument('secret', type=str, help='Path to BigQuery client secret')
    parser.add_argument('gcp_project', type=str, help='Name of the project within GCP that will be authenticated')

    args = parser.parse_args()

    BigQuery_client.connect(args.secret, args.gcp_project)
    # app.run(host="0.0.0.0")
    app.run(port=8000)