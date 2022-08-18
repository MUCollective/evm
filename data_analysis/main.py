import json
import argparse
import pdb
import os
from datetime import datetime
import pandas as pd

from bigquery_client import BigQuery_client
from gen_tree import gen_tree
from np_encoder import NpEncoder


if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Generate a tree stucture from cloud logs.')

    parser.add_argument('secret', type=str, help='Path to BigQuery client secret')
    parser.add_argument('gcp_project', type=str, help='Name of the project within GCP that will be authenticated')

    args = parser.parse_args()

    BigQuery_client.connect(args.secret, args.gcp_project)

    logs_dataframe = BigQuery_client.trans_dataframe()

    now = datetime.now()
    current_time = now.strftime("%d-%m-%Y-%H:%M:%S")
    print("Process Date and Time =", current_time)

    os.makedirs('out/raw', exist_ok=True)
    logs_dataframe.to_csv('out/raw/{}.csv'.format(current_time))

    tree_structure = gen_tree(logs_dataframe)

    os.makedirs('out/tree', exist_ok=True)
    with open('out/tree/{}.json'.format(current_time), 'w') as f:
        f.write(json.dumps(tree_structure.to_obj(), sort_keys=True, indent=4, cls=NpEncoder))
