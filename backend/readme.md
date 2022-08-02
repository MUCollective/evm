# MIMIC IV Database API

This api is based on Google BigQuery. 

## Install

```shell
pip install -r requirements.txt
```

```shell
python3 app.py
```

Visit the url and login google account to get the authorization code (the google account need to be verified by ziyangguo1030@gmail.com). 

After verification, api will listen on `5000` port of your localhost.

## Api

Now we only support querying ICU data. All data will be updated soon.

| Methods | Url                        | Query                                          | Response                        |
| ------- | -------------------------- | ---------------------------------------------- | ------------------------------- |
| GET     | /icu/item                  | itemidlist: []<br/>withheader: true \| false   | bigquery result                 |
| GET     | /icu/itemheader            |                                                | header of d_item table          |
| GET     | /icu/chartevents           | itemidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/charteventsheader     |                                                | header of chartevents table     |
| GET     | /icu/datetimeevents        | itemidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/datetimeeventsheader  |                                                | header of datetimeevents table  |
| GET     | /icu/icustays              | stayidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/icustaysheader        |                                                | header of icustays table        |
| GET     | /icu/inputevents           | itemidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/inputeventsheader     |                                                | header of inputevents table     |
| GET     | /icu/outputevents          | itemidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/outputeventsheader    |                                                | header of outputevents table    |
| GET     | /icu/procedureevents       | itemidlist: []<br/>withheader: true \|false    | bigquery result                 |
| GET     | /icu/procedureeventsheader |                                                | header of procedureevents table |
| GET     | /core/patients             | patientidlist: []<br/>withheader: true \|false | bigquery result                 |
| GET     | /core/patientsheader       |                                                | header of patients table        |
| GET     | /core/admissions           | patientidlist: []<br/>withheader: true \|false | bigquery result                 |
| GET     | /core/admissionsheader     |                                                | header of admissions table      |
| GET     | /core/transfers            | patientidlist: []<br/>withheader: true \|false | bigquery result                 |
| GET     | /core/transfersheader      |                                                | header of transfers table       |