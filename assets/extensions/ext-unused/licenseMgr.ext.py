import json
import urllib2

licenseServerApiEndpoint = "https://zd.xcalar.net/license/api/v1.0/secure/listTable"

def getTable(filePath, inStream, tableName = "license"):
    inObj = json.loads(inStream.read())
    startRow = inObj["startRow"]
    if startRow != 0:
        # Only load on 1 node for now
        return

    data = {"secret": "xcalarS3cret", "tableName": tableName}

    req = urllib2.Request(licenseServerApiEndpoint)
    req.add_header('Content-Type', 'application/json')
    rsp = urllib2.urlopen(req, json.dumps(data))
    parsedData = json.loads(rsp.read())
    for row in parsedData:
        yield row

