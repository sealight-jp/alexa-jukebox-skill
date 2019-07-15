// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const NORMAL = 'N';
const SHUFFLE = 'S';
// parameter関連
function next() {
    if (this.mode === SHUFFLE) {
        this.num = Math.floor(Math.random() * 10000);
    }
    else {
        this.num++;
    }
}
function previous() {
    if (this.num > 0) {
        this.num--;
    }
}
function token() {
    return this.mode + '-' + String(this.num) + '-' + this.cat;
}
function url() {
    // カテゴリー(this.cat)と何曲目か(this.num)を元にして、mp3ファイルのURLを作成して返す。
    // 例：'https://my-data-server.jp/data/JPOP/11.mp3'
    return 'https://my-data-server.jp/data/' + this.cat + '/' + String(this.num + 1) + '.mp3';
}
function Para(mode = NORMAL, num = 0, cat = 'all') {
    this.mode = mode;
    this.num = num;
    this.cat = cat;
    this.next = next;
    this.previous = previous;
    this.token = token;
    this.url = url;
}
function getPara(h) {
    let para = new Para();
    const token = h.requestEnvelope.context.AudioPlayer.token;
    if (token !== undefined && token.indexOf('-') !== -1) {
        const work = token.split('-');
        para.mode = work[0];
        para.num = Number(work[1]);
        para.cat = work[2];
    }
    return para;
}
// slot関連
function checkNumber(h) {
    const slot_num = h.requestEnvelope.request.intent.slots.number;
    if (slot_num) {
        let num = Number(slot_num.value);
        if (!isNaN(num)) {
            return num;
        }
    }
    return undefined;
}
function checkCategory(h) {
    const slot_cat = h.requestEnvelope.request.intent.slots.category;
    if (slot_cat && slot_cat.resolutions && slot_cat.resolutions.resolutionsPerAuthority) {
        if (slot_cat.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
            if (slot_cat.resolutions.resolutionsPerAuthority[0].values.length === 1) {
                return slot_cat.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            }
        }
    }
    return undefined;
}
// Intent関連
const LaunchRequestHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(h) {
        let para = new Para(SHUFFLE);
        para.next();
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            .speak('全部の曲をシャッフル再生します。')
            .getResponse();
    }
};
const CountIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'CountIntent';
    },
    async handle(h) {
        let para = getPara(h);
        const speechText = '現在の曲は' + String(para.num + 1) + '番目です。'
        return h.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
const DirectIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'DirectIntent';
    },
    handle(h) {
        const category = h.requestEnvelope.request.intent.slots.category.value;
        const cat = checkCategory(h);
        if (cat === undefined) {
            const speechText = category + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        const number = h.requestEnvelope.request.intent.slots.number.value;
        const num = checkNumber(h);
        if (num === undefined) {
            const speechText = number + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        let para = getPara(h);
        para.cat = cat;
        para.mode = NORMAL;
        para.num = num - 1;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            .speak(category + 'の' + number + '番目の曲を再生します。')
            .getResponse();
    }
};
const CategoryIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'CategoryIntent';
    },
    handle(h) {
        const category = h.requestEnvelope.request.intent.slots.category.value;
        const cat = checkCategory(h);
        if (cat === undefined) {
            const speechText = category + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        let para = getPara(h);
        para.cat = cat;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            .speak(category + 'の曲を再生します。')
            .getResponse();
    }
};
const NumberIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'NumberIntent';
    },
    handle(h) {
        const number = h.requestEnvelope.request.intent.slots.number.value;
        const num = checkNumber(h);
        if (num === undefined) {
            const speechText = number + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        let para = getPara(h);
        para.mode = NORMAL;
        para.num = num - 1;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            .speak(number + '番目の曲を再生します。')
            .getResponse();
    }
};
const ForwardIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'ForwardIntent';
    },
    handle(h) {
        const number = h.requestEnvelope.request.intent.slots.number.value;
        const num = checkNumber(h);
        if (num === undefined) {
            const speechText = number + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        let para = getPara(h);
        para.mode = NORMAL;
        para.num += num;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            //.speak(number + '曲進めて、' + String(para.num + 1) + '番目の曲を再生します。')
            .speak(number + '曲進めます。')
            .getResponse();
    }
};
const BackwardIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'BackwardIntent';
    },
    handle(h) {
        const number = h.requestEnvelope.request.intent.slots.number.value;
        const num = checkNumber(h);
        if (num === undefined) {
            const speechText = number + 'を認識できませんでした。';
            return h.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        let para = getPara(h);
        para.mode = NORMAL;
        para.num -= num;
        if (para.num < 0) {
            para.num = 0;
        }
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            //.speak(number + '曲戻して、' + String(para.num + 1) + '番目の曲を再生します。')
            .speak(number + '曲戻します。')
            .getResponse();
    }
};
const PauseIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.PauseIntent';
    },
    async handle(h) {
        return h.responseBuilder
            .addAudioPlayerStopDirective()
            .speak('中断します。')
            .getResponse();
    }
};
const ResumeIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.ResumeIntent';
    },
    async handle(h) {
        let para = getPara(h);
        const offset = h.requestEnvelope.context.AudioPlayer.offsetInMilliseconds;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), offset, null)
            .speak('再開します。')
            .getResponse();
    }
};
const NextIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.NextIntent';
    },
    async handle(h) {
        let para = getPara(h);
        para.next();
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            //.speak('次の' + String(para.num + 1) + '番目の曲を再生します。')
            .speak('次の曲を再生します。')
            .getResponse();
    }
};
const PreviousIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.PreviousIntent';
    },
    async handle(h) {
        let para = getPara(h);
        para.mode = NORMAL;
        para.previous();
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), 0, null)
            //.speak('前の' + String(para.num + 1) + '番目の曲を再生します。')
            .speak('前の曲を再生します。')
            .getResponse();
    }
};
const ShuffleOnIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.ShuffleOnIntent';
    },
    async handle(h) {
        let para = getPara(h);
        para.mode = SHUFFLE;
        const offset = h.requestEnvelope.context.AudioPlayer.offsetInMilliseconds;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), offset, null)
            .speak('シャッフルをオンにします。')
            .getResponse();
    }
};
const ShuffleOffIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.ShuffleOffIntent';
    },
    async handle(h) {
        let para = getPara(h);
        para.mode = NORMAL;
        const offset = h.requestEnvelope.context.AudioPlayer.offsetInMilliseconds;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', para.url(), para.token(), offset, null)
            .speak('シャッフルをオフにします。')
            .getResponse();
    }
};
// Playback関連
const PlaybackNearlyFinishedHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'AudioPlayer.PlaybackNearlyFinished';
    },
    async handle(h) {
        let para = getPara(h);
        para.next();
        const expPrevToken = h.requestEnvelope.context.AudioPlayer.token;
        return h.responseBuilder
            .addAudioPlayerPlayDirective('ENQUEUE', para.url(), para.token(), 0, expPrevToken)
            .getResponse();
    }
};
const PlaybackStartedHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'AudioPlayer.PlaybackStarted';
    },
    async handle(h) {
        return h.responseBuilder
            .getResponse();
    }
};
const PlaybackFinishedHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'AudioPlayer.PlaybackFinished';
    },
    async handle(h) {
        return h.responseBuilder
            .getResponse();
    }
};
const PlaybackStoppedHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'AudioPlayer.PlaybackStopped';
    },
    async handle(h) {
        return h.responseBuilder
            .getResponse();
    }
};
const PlaybackFailedHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'AudioPlayer.PlaybackFailed';
    },
    async handle(h) {
        return h.responseBuilder
            .getResponse();
    }
};
// その他
const HelpIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && h.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(h) {
        const speechText = 'カテゴリーや番号を指定できます。何を再生しますか？';
        return h.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest'
            && (h.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || h.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(h) {
        const speechText = '終了します。';
        return h.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechText)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(h) {
        // Any cleanup logic goes here.
        const speechText = 'ご利用ありがとうございました。';
        return h.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechText)
            .getResponse();
    }
};
// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(h) {
        return h.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(h) {
        //const intentName = h.requestEnvelope.request.intent.name;
        const speechText = '現在その機能は使えません。';
        return h.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(h, error) {
        //console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = 'すみません、もう一度お願いします。';
        return h.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CountIntentHandler,
        DirectIntentHandler,
        CategoryIntentHandler,
        NumberIntentHandler,
        ForwardIntentHandler,
        BackwardIntentHandler,
        PauseIntentHandler,
        ResumeIntentHandler,
        NextIntentHandler,
        PreviousIntentHandler,
        ShuffleOnIntentHandler,
        ShuffleOffIntentHandler,
        PlaybackNearlyFinishedHandler,
        PlaybackStartedHandler,
        PlaybackFinishedHandler,
        PlaybackStoppedHandler,
        PlaybackFailedHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .lambda();
