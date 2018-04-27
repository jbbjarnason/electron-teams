/**
 * Teams notifications in Chrome
 */
var TeamsNotifications = {
  keepMessageContentPrivate: true,
  profileUrl:                null,
  myName:                    null,
  hasFocus:                  false,
  notification:              null,
  window:                    null
};

TeamsNotifications.strip = function(html) {
  var tmp       = document.createElement('div');
  tmp.innerHTML = html;

  return tmp.textContent || tmp.innerText || '';
};

TeamsNotifications.analyseMessages = function(messages) {
  console.debug('TeamsNotifications', 'original messages', messages);

  // filter messages
  var mention               = false;
  var resourceTypesToNotify = ['NewMessage', 'ConversationUpdate'];
  messages                  = $.grep(messages, function(message, i) {
    if (message.resource && message.resource.messagetype === 'Control/Typing') {
      return false;
    }
    if (
      typeof message.resourceType !== 'undefined'
      && resourceTypesToNotify.indexOf(message.resourceType) !== -1
    ) {
      if (typeof message.Mentions !== 'undefined' && message.Mentions.length >= 0) {
        mention = true;
      }

      return true;
    }

    return false;
  });

  // TODO for the moment consider mention always since correctly detected
  mention = true;

  if (messages.length > 0) {
    console.debug('TeamsNotifications', 'filtered messages', messages);
    var lastMessage = messages[messages.length - 1];

    var conversation = null;

    // deduce context
    if (lastMessage.resource.threadProperties) {
      if (lastMessage.resource.threadProperties.spaceThreadTopic) {
        conversation = lastMessage.resource.threadProperties.spaceThreadTopic;
      } else if (lastMessage.resource.threadProperties.topicThreadTopic) {
        conversation = lastMessage.resource.threadProperties.topicThreadTopic;
      }
    }

    // deduce conversation url
    var url = null;
    if (lastMessage.resource && lastMessage.resource.conversationLink) {
      var convId = lastMessage.resource.conversationLink.substr(
        lastMessage.resource.conversationLink.lastIndexOf('/') + 1
      );

      // remove message id that can be incorrect one
      convId = convId.replace(/;messageid=.*/, '');

      if (lastMessage.resource.threadtype) {
        if (lastMessage.resource.threadtype === 'topic') {
          // channel message
          // eg: #/conversations/General?threadId=19:8139022971bb4f03994acbb208d53840@thread.skype&ctx=channel
          url = '#/conversations/';
          url += encodeURI(lastMessage.resource.threadtopic); // channel name
          url += '?threadId=' + encodeURI(convId);
          url += '&ctx=channel';
        } else if (lastMessage.resource.threadtype === 'chat') {
          // eg: #/conversations/19:4010a740b2064ca9b3eaf6e13b9093e0@thread.skype?ctx=chat
          url = '#/conversations/';
          url += convId + '?ctx=chat';
        }
      }
      if (url === null) {
        console.debug('TeamsNotifications', 'conversation url unknown');
      } else {
        console.debug('TeamsNotifications', 'conversation url calculated', url);
      }
    }

    // TODO for the moment ignore like message
    var likeMessage = (
      lastMessage.resource
      && lastMessage.resource.properties
      && lastMessage.resource.properties.activity
      && lastMessage.resource.properties.activity.activityType
      && lastMessage.resource.properties.activity.activityType === 'like'
    );
    if (likeMessage) {
      console.debug('TeamsNotifications', 'like message ignored');

      return;
    }

    // deduce author name
    var imDisplayName = null;
    if (
      lastMessage.resource
      && lastMessage.resource.imdisplayname
      && lastMessage.resource.imdisplayname.indexOf('orgid:') === -1
    ) {
      imDisplayName = lastMessage.resource.imdisplayname;
    }
    if (
      imDisplayName === null
      && lastMessage.resource
      && lastMessage.resource.properties
      && lastMessage.resource.properties.activity
      && lastMessage.resource.properties.activity.sourceUserImDisplayName
    ) {
      // like messages
      imDisplayName = lastMessage.resource.properties.activity.sourceUserImDisplayName;
    }

    if (imDisplayName) {
      conversation = conversation ? conversation + ': ' + imDisplayName : imDisplayName;
    }

    if (TeamsNotifications.myName === conversation) {
      console.debug('TeamsNotifications', 'ignore my own messages');

      return;
    }

    // TODO later add CTLSTools privacy settings
    if (!TeamsNotifications.keepMessageContentPrivate) {
      var lastMessageContent = null;
      if (lastMessage.resource) {
        if (typeof lastMessage.resource.content !== 'undefined' && lastMessage.resource.content.length > 0) {
          lastMessageContent = lastMessage.resource.content;
        } else if (lastMessage.resource.properties && lastMessage.resource.activity && lastMessage.resource.activity.messagePreview) {
          lastMessageContent = lastMessage.resource.properties.activity.messagePreview;
        }
      }

      // strip html content
      lastMessageContent = TeamsNotifications.strip(lastMessageContent);

      conversation = conversation ? conversation + ' : ' + lastMessageContent : lastMessageContent;
    }

    if (conversation) {
      console.info('TeamsNotifications', 'notify user', conversation);
      TeamsNotifications.notification         = new Notification(
        'Teams Notification',
        {
          body:               conversation,
          icon:               'https://az818438.vo.msecnd.net/icons/teams.png',
          // when multi notifications opening at once,
          // the tag just allow one notification to be opened
          tag:                'TeamsNotificationOnlyOneInstance',
          // do not close the notification automatically
          requireInteraction: true,
          // url to pen when user clicks on the notification
          data:               url
        }
      );
      TeamsNotifications.notification.onclick = function(event) {
        event.preventDefault(); // prevent the browser from focusing the Notification's tab
        if (TeamsNotifications.notification.data) {
          TeamsNotifications.window.location.href = TeamsNotifications.notification.data;
        }
        TeamsNotifications.window.focus();
      };

      // If you are mentioned in the chat, keep it displayed until you actively close it.
      if (!mention) {
        window.setTimeout(function() {
          TeamsNotifications.notification.close();
        }, 5000);
      }
    }
  }
};

TeamsNotifications.overrideLoadPoll = function() {
  var origOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function(method, url, async) {
    // the first profile url is mine
    if (TeamsNotifications.profileUrl === null && url.indexOf('profilepicture') !== -1) {
      TeamsNotifications.profileUrl = encodeURI(url);
    }

    this.addEventListener('load', function() {
      // if (this.responseURL.startsWith('https://api.teams.skype.com')) {
      if (this.response !== null) {
        var responseText = this.response;
        if (typeof responseText === 'object') {
          responseText = JSON.stringify(responseText);
        }
        if (responseText.indexOf('6c24e6b7-9aec-473a-8580-87138158dca1') !== -1) {
          console.log('ResponseContent', this.responseURL, responseText);
        }
      }

      // deduce my own name from first profile url
      if (TeamsNotifications.myName === null && this.responseURL === TeamsNotifications.profileUrl) {
        var url                   = new URL(this.responseURL);
        TeamsNotifications.myName = url.searchParams.get('displayname');
      }

      // need of notification only if Teams has not focus
      if (!TeamsNotifications.hasFocus) {
        // poll messages query
        if (
          this.responseURL.endsWith('/poll')
          && typeof this.response !== 'undefined'
          && typeof this.response.eventMessages !== 'undefined'
        ) {
          TeamsNotifications.analyseMessages(this.response.eventMessages);
        }
      }
    });

    origOpen.apply(this, arguments);
  };
};

// Let's check if the browser supports notifications
if (!('Notification' in window)) {
  console.info('This browser does not support desktop notification');
}

// Let's check whether notification permissions have already been granted
else if (Notification.permission === 'granted') {
  console.info('TeamsNotifications', 'Notification previously granted permission.');
  TeamsNotifications.overrideLoadPoll();
}

// Otherwise, we need to ask the user for permission
else if (Notification.permission !== 'denied') {
  Notification.requestPermission(function(permission) {
    // If the user accepts, let's create a notification
    if (permission === 'granted') {
      console.info('TeamsNotifications', 'Notification just granted permission.');
      TeamsNotifications.overrideLoadPoll();
    }
    else {
      console.info('TeamsNotifications', 'Notification was denied permission to notify.');
    }
  });

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them any more.
}


function check() {
  if (document.hasFocus() === TeamsNotifications.hasFocus) {
    return;
  }

  TeamsNotifications.hasFocus = !TeamsNotifications.hasFocus;
  console.debug('TeamsNotifications', 'Teams window has focus : ' + TeamsNotifications.hasFocus);

  // close notification once Teams gains focus
  if (TeamsNotifications.hasFocus && TeamsNotifications.notification !== null) {
    TeamsNotifications.notification.close();
    TeamsNotifications.notification = null;
  }
}

TeamsNotifications.hasFocus = document.hasFocus();
TeamsNotifications.window   = window;

check();
setInterval(check, 5000);
