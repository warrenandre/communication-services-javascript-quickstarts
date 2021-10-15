import { ServerCallLocator } from "@azure/communication-callingserver";

var cfg = require('../../config')

const connectionString = cfg.ConnectionString
const callbackUri = cfg.CallbackUri

var CallingServerClient = require('@azure/communication-callingserver')
const { EventGridDeserializer } = require('@azure/eventgrid');
const { BlobStorageHelper } = require('../../BlobStorageHelper');
const { Logger, MessageType } = require("../../Logger");

const client = new CallingServerClient.CallingServerClient(connectionString)

var recordingData = {};

exports.startUp = function (req, res) {
   res.json('App is running...')
}

exports.startRecording = async function (req, res) {
   try {
      let serverCallId = req.query.serverCallId
      if (!serverCallId || String(serverCallId).trim() == '') {
         return res.status(400).json('serverCallId is invalid')
      }
      Logger.logMessage(MessageType.INFORMATION, 'Start recording API called with serverCallId =  ' + serverCallId)
      var locator: ServerCallLocator = { serverCallId: serverCallId }
      var output = await client.startRecording(locator, callbackUri);

      recordingData[serverCallId] = output.recordingId
      return res.json(output);
   }
   catch (e) {
      var output = BlobStorageHelper.getExecptionDetails(e);
      return res.status(output.statusCode).json(String(output.output))
   }

};

exports.pauseRecording = async function (req, res) {
   try {
      let serverCallId = req.query.serverCallId
      if (!serverCallId || String(serverCallId).trim() == '') {
         return res.status(400).json('serverCallId is invalid')
      }

      let recordingId = req.query.recordingId

      if (!recordingId || String(recordingId).trim() == '') {
         recordingId = recordingData[serverCallId]
      }
      recordingData[serverCallId] = recordingId;

      Logger.logMessage(MessageType.INFORMATION, 'Pause recording API called with serverCallId =  ' + serverCallId + ' and recordingId =  ' + recordingId)

      var output = await client.pauseRecording(recordingId)
      if (output) {
         return res.json('Ok');
      }
      else {
         return res.status(output.statusCode ? output.statusCode : '500').json(output.message)
      }
   }
   catch (e) {
      var output = BlobStorageHelper.getExecptionDetails(e);
      return res.status(output.statusCode).json(String(output.output))
   }
};

exports.resumeRecording = async function (req, res) {
   try {
      let serverCallId = req.query.serverCallId
      if (!serverCallId || String(serverCallId).trim() == '') {
         return res.status(400).json('serverCallId is invalid')
      }
      let recordingId = req.query.recordingId

      if (!recordingId || String(recordingId).trim() == '') {
         recordingId = recordingData[serverCallId]
      }
      recordingData[serverCallId] = recordingId;

      Logger.logMessage(MessageType.INFORMATION, 'Resume recording API called with serverCallId =  ' + serverCallId + ' and recordingId =  ' + recordingId)

      var output = await client.resumeRecording(recordingId)
      if (output) {
         return res.json('Ok');
      }
      else {
         return res.status(output.statusCode ? output.statusCode : '500').json(output.message)
      }
   }
   catch (e) {
      var output = BlobStorageHelper.getExecptionDetails(e);
      return res.status(output.statusCode).json(String(output.output))
   }
};

exports.stopRecording = async function (req, res) {
   try {
      let serverCallId = req.query.serverCallId
      if (!serverCallId || String(serverCallId).trim() == '') {
         return res.status(400).json('serverCallId is invalid')
      }
      let recordingId = req.query.recordingId

      if (!recordingId || String(recordingId).trim() == '') {
         recordingId = recordingData[serverCallId]
      }
      recordingData[serverCallId] = recordingId;

      Logger.logMessage(MessageType.INFORMATION, 'Stop recording API called with serverCallId =  ' + serverCallId + ' and recordingId =  ' + recordingId)

      var output = await client.stopRecording(recordingId)
      if (output) {
         return res.json('Ok');
      }
      else {
         return res.status(output.statusCode ? output.statusCode : '500').json(output.message)
      }
   }
   catch (e) {
      var output = BlobStorageHelper.getExecptionDetails(e);
      return res.status(output.statusCode).json(String(output.output))
   }
};

exports.getRecordingState = async function (req, res) {
   try {
      let serverCallId = req.query.serverCallId
      if (!serverCallId || String(serverCallId).trim() == '') {
         return res.status(400).json('serverCallId is invalid')
      }
      let recordingId = req.query.recordingId

      if (!recordingId || String(recordingId).trim() == '') {
         recordingId = recordingData[serverCallId]
      }
      recordingData[serverCallId] = recordingId;

      Logger.logMessage(MessageType.INFORMATION, 'Recording State API called with serverCallId =  ' + serverCallId + ' and recordingId =  ' + recordingId)

      var output = await client.getRecordingProperties(recordingId)
      if (output && output.recordingState) {
         return res.json(output.recordingState);
      }
      else {
         return res.status(output.statusCode ? output.statusCode : '500').json(output.message)
      }
   }
   catch (e) {
      var output = BlobStorageHelper.getExecptionDetails(e);
      return res.status(output.statusCode).json(String(output.output))
   }
};

exports.getRecordingFile = async function (req, res) {
   try {
      let data = req.body;

      Logger.logMessage(MessageType.INFORMATION, "Request data ---- >" + JSON.stringify(data))
      const deserializedData = await new EventGridDeserializer().deserializeEventGridEvents(data[0]);
      const event = deserializedData[0];

      Logger.logMessage(MessageType.INFORMATION, "Event type is  ---->" + event.eventType)

      if (event.eventType == 'Microsoft.EventGrid.SubscriptionValidationEvent') {
         try {
            if (event.data && event.data.validationCode) {
               let code = event.data.validationCode
               Logger.logMessage(MessageType.INFORMATION, 'validationCode = ' + code)
               let output = { "validationResponse": code }
               Logger.logMessage(MessageType.INFORMATION, "Successfully Subscribed EventGrid.ValidationEvent --> " + JSON.stringify(output))
               return res.json(output)
            }
            else {
               return res.status(400).json('Not successfull');
            }
         }
         catch (e) {
            var output = BlobStorageHelper.getExecptionDetails(e);
            return res.status(output.statusCode).json(String(output.output))
         }
      }

      if (event.eventType == 'Microsoft.Communication.RecordingFileStatusUpdated') {
         var acsRecordingChunkInfoProperties = event.data.recordingStorageInfo.recordingChunks[0]

         Logger.logMessage(MessageType.INFORMATION, 'DownloadContent data -----> ' + JSON.stringify(acsRecordingChunkInfoProperties))

         const document_id = acsRecordingChunkInfoProperties['documentId']
         const content_location = acsRecordingChunkInfoProperties['contentLocation']
         const metadata_location = acsRecordingChunkInfoProperties['metadataLocation']

         var processmp4FileResponse = await process_file(document_id, content_location, 'mp4', 'recording')

         if (processmp4FileResponse.output == 'true') {

            var processmetadataFileResponse = await process_file(document_id, metadata_location, 'json', 'metadata')

            if (processmetadataFileResponse.output == 'true') {
               Logger.logMessage(MessageType.INFORMATION, "Processing recording and metadata files completed successfully.");
               return res.status('statusCode').json
            }
            else {
               Logger.logMessage(MessageType.INFORMATION, "Processing metadata file failed with message --> " + String(processmetadataFileResponse.output))
               return res.status(processmetadataFileResponse.statusCode).json(String(processmetadataFileResponse.output))
            }
         }

         Logger.logMessage(MessageType.INFORMATION, "Processing mp4 recording file failed with message --> " + String(processmp4FileResponse.output))
         return res.status(processmp4FileResponse.statusCode).json(String(processmp4FileResponse.output))
      }
   }
   catch (e) {
      {
         var output = BlobStorageHelper.getExecptionDetails(e);
         return res.status(output.statusCode).json(String(output.output))
      }
   }
};

async function process_file(documentId: string, downloadLocation: string, fileFormat: string, downloadType: string): Promise<{ 'output': string, 'statusCode': string }> {
   try {
      Logger.logMessage(MessageType.INFORMATION, "Start downloading " + downloadType + " file. Download url --> " + downloadLocation)
      var fileName = documentId + '.' + fileFormat

      var downloadResponse = await client.download(downloadLocation)
      Logger.logMessage(MessageType.INFORMATION, 'downloadContent complete response ---->' + String(downloadResponse))

      if (downloadResponse) {
         var blobUploadResult = await BlobStorageHelper.uploadFileToStorage(cfg.ContainerName, fileName, cfg.BlobStorageConnectionString)

         if (blobUploadResult.output == true) {
            BlobStorageHelper.getBlobSasUri(cfg.ContainerName, fileName, cfg.StorageAccountName, cfg.StorageAccountKey)
         }
         return blobUploadResult
      }
      else {
         return { 'output': 'Error', 'statusCode': '500' }
      }
   }
   catch (e) {
      return BlobStorageHelper.getExecptionDetails(e);
   }
}