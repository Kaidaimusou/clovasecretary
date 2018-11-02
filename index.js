const clova = require('@line/clova-cek-sdk-nodejs');

const clovaSkillHandler = clova.Client
  .configureSkill()
  .onLaunchRequest(responseHelper => {
    responseHelper.setSessionAttributes({});
    responseHelper.setSimpleSpeech({
      lang: 'ja',
      type: 'PlainText',
      value: 'おはようございます。今日も頑張りましょう。',
    });
  })
  .onIntentRequest(async responseHelper => {
    setResponse(responseHelper);
  })
  .onSessionEndedRequest(responseHelper => {
    const sessionId = responseHelper.getSessionId();

  });


// レスポンスを成形する。
const setResponse = function(responseHelper) {
  const intent = responseHelper.getIntentName();
  const slots = responseHelper.getSlots();

  switch (intent) {
      case 'MenuIntent':
      case 'Clova.YesIntent':
        // Build speechObject directly for response
        const session = responseHelper.getSessionAttributes();
        console.log(session);
        if(!!session.pushFlag) {
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText('メッセージをどうぞ')
          );
          responseHelper.setSessionAttributes({
            "pushFLag": false
          });
        } else if(!!session.messageFlag) {
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText('1件目、相談したいことがあるので、戻ったら教えて山田、2件目、相談したいことがあるので、一区切りついたら教えて田中')
          );
          responseHelper.setSessionAttributes({
            "messageFlag": false
          });
        }
        break;
      case 'Clova.NoIntent':
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('いえいえ')
        );
        break;
      case 'NoOpenMessageIntent':
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('かしこまりました。')
        );
        break;
      case 'PushMessageSomeoneIntent':
        responseHelper.setSessionAttributes({
          "pushFlag": true
        });
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('わかりました、メッセージをどうぞ')
        );
        break;
      case 'PushMessageNoneIntent':
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('誰にメッセージを残しますか')
        );
        break;
      case 'CallSomeoneIntent':
        if(!!slots){
          console.log(slots);
          responseHelper.setSessionAttributes({
            "pushFlag": true
          });
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText(slots.name.value + 'は今は資料作成中です。伝言を残しますか？')
          );
        } else{
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText('名前がよく聞き取れませんでした、もう一度お願いします。')
          );
        }
        break;
      case 'MessageIntent':
          if(!!slots) {
            responseHelper.setSimpleSpeech(
              clova.SpeechBuilder.createSpeechText('相談したいので' + slots.message)
            );
          } else{
            responseHelper.setSimpleSpeech(
              clova.SpeechBuilder.createSpeechText('相談したいので戻ったら教えてください')
            );
          }
        break;
      case 'OpenMessageIntent':
        responseHelper.setSessionAttributes({
          messageFlag: true
        });
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('伝言が2件あります。聞かれますか')
        );
        break;
      case 'OpenTaskIntent':
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('今日は10時から資料作成、12時から客先訪問です。頑張ってください。')
        );
        break;
      case 'RegisterIntent':
        console.log(slots);
        if(!!slots.start_time_two) {
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText(
              slots.start_time + 'から' + slots.task + " " + slots.start_time_two + 'から' + slots.task_two + "ですね。登録しておきます。"
            )
          );
        } else{
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText(
                slots.start_time + 'から' + slots.task + " " + "ですね。登録しておきます。"
            )
          );
        }
        break;
    }
}


// データを返す。
exports.handler = async (event, content) => {
  console.log(event);
  const signature = event.headers.signaturecek || event.headers.SignatureCEK;
  const applicationId = process.env["applicationId"];
  const requestBody = event.body;
  // ヘッダーとスキルのExtensionIdとリクエストボディで検証
  await clova.verifier(signature, applicationId, requestBody);

  // 「Lambdaプロキシの結合」を有効にするとCEKからのJSONの中身は「event.body」で文字列で取得できる。
  var ctx = new clova.Context(JSON.parse(event.body));
  const requestType = ctx.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  if (requestHandler) {
    await requestHandler.call(ctx, ctx);

    console.log("--- responseObject ---");
    console.log(ctx.responseObject);
    console.log("--- responseObject end ---");

    // CEKに返すレスポンス
    const response =  {
        "isBase64Encoded": false,
        "statusCode": 200,
        "headers": {},
        "body": JSON.stringify(ctx.responseObject),
    }
    console.log(response);
    return response;
  } else {
    throw new Error(`Unable to find requestHandler for '${requestType}'`);
  }
}