import type { UserGuideGroup } from "./userGuideContent";

export const englishUserGuideGroups: UserGuideGroup[] = [
  {
    id: "start",
    label: "Starting counseling",
    topics: [
      {
        id: "meet-ling",
        navigationLabel: "Meet Ling and the studio",
        title: "Meet Ling and Qunxin Psychology Studio",
        lead: "Ling is an AI counseling app released under the Apache-2.0 License. Qunxin Psychology Studio is the in-app setting for Ling’s AI counselor team. On your first visit, you can read the welcome and privacy information and look around the studio first; model connection and informed consent are guided before your first session, with optional local password setup.",
        points: [
          { label: "Three counseling characters", text: "Cheng Ling, Zhou Zhou, and Lin Leshui are powered by large language models. They are not human counselors working at another computer." },
          { label: "Designed for counseling", text: "Ling is not a general model with different names attached. It includes counselor foundations, session methods, safety boundaries, context and memory handling, and post-session workflows designed for AI counseling." },
          { label: "Development and testing", text: "Development of the core counseling system draws on counseling ethics, relevant theory, and published research, with scenario-based testing used to examine response boundaries. This design work and internal testing do not constitute professional licensure, clinical validation, or a guarantee of outcomes." },
          { label: "Scope of use", text: "“AI counseling” here means supportive AI conversation and self-exploration. It cannot replace qualified counseling, psychotherapy, psychiatric care, medical diagnosis, or crisis intervention." },
          { label: "Entering the waiting room", text: "On your first visit, Cheng Ling offers a brief welcome at reception. After that, the three counselors take turns by date. Soft glowing points open different areas, while the bottom bar provides direct access to counselor letters, booking, and settings." }
        ],
        note: "You do not have to agree with everything the AI says or disclose anything you do not wish to share. Project information and the counselor-extension specification are available in the public repository. For questions about the product, privacy, safety, or informed consent, contact openling@xiaoqunpsy.cn."
      },
      {
        "id": "first-steps",
        "navigationLabel": "Where to begin",
        "title": "Where to begin",
        "lead": "Explore the studio first and decide whether to begin a formal session. You do not need AI expertise or to complete every setting at once.",
        "steps": [
          "Explore reception, the counselor portraits, the bookcase, and the garden.",
          "Choose Book a session in the bottom bar and select a counselor. An unfinished session with that counselor will reopen first.",
          "Follow the required model-connection and informed-consent steps. Set a local password or skip it where offered.",
          "Read or skip the opening, then type and send your first message. Voice transcription also waits for you to send it.",
          "Return to the waiting room for a break. End this session when you want organization and letter writing to begin."
        ],
        "note": "Reception small talk consists of prewritten introductions. It is not a freeform AI session, does not call a model, and creates no counseling record."
      },
      {
        "id": "connect-model",
        "navigationLabel": "Models and API keys",
        "title": "Models and API keys",
        "lead": "A model is the AI that generates responses, and a provider is the platform offering it. An API key is a special string from that platform which allows Ling to use services through your account. It is not a password or verification code.",
        "steps": [
          "Sign up or log in on the provider’s official website. Open its developer platform or API console, create an API key, and copy it.",
          "Open Settings → Model connection, select the same provider, and paste the key. You can keep the preset URL and model initially.",
          "Test the connection without saving first. After success, save the configuration and wait for confirmation."
        ],
        "points": [
          {
            "label": "The service address",
            "text": "The Base URL is an API endpoint, not a chat webpage. Usually keep the preset; custom services require the compatible API address supplied by the provider."
          },
          {
            "label": "Cost and privacy",
            "text": "API calls may cost money, and chat subscriptions may not include API credit. Keep keys private like passwords. Online services receive the counseling content needed to respond."
          },
          {
            "label": "Local models",
            "text": "First start a model service in Ollama or LM Studio. Then detect, select, test, and save in Ling. Ling does not download or start the model."
          }
        ],
        "note": "The connection guide at the top of Model connection includes five detailed steps, key replacement, and troubleshooting. Testing does not save. A blank field keeps the saved key."
      },
      {
        id: "choose-counselor",
        navigationLabel: "Meet and choose a counselor",
        title: "Meet and choose a counselor",
        lead: "Select one of the three counselor portraits on the waiting-room wall to open the introduction booklet and learn about each AI character’s orientation, working style, and common areas of focus.",
        points: [
          { label: "Cheng Ling | Person-centered & psychodynamic", text: "Attends to feelings, relational experience, inner needs, and conflict, with an emphasis on gradual exploration within an experience of being understood." },
          { label: "Zhou Zhou | Solution-focused orientation", text: "Attends to the change you hope for, what is already working, and available resources, then works with you toward a specific, appropriately sized, feasible next step." },
          { label: "Lin Leshui | Chinese philosophy of mind-and-heart orientation", text: "Attends to mind and body, lived circumstances, and valued direction, drawing on Chinese philosophy of mind-and-heart to understand relationships, responsibility, gain and loss, and life transition." }
        ],
        note: "All three characters are powered by AI. You do not need to find the single “correct” choice—begin with the person you feel most willing to speak with now."
      },
      {
        id: "start-session",
        navigationLabel: "Start a new session",
        title: "Start a new session",
        lead: "After choosing a counselor, select “Book a session.” Before the first session, Ling asks you to set an unlock password and save a recovery code. If no model is connected, it then guides you through configuration and displays the full informed-consent document. Ling creates the local session only after you confirm each step.",
        points: [
          { label: "Before entering", text: "The counselor offers a short opening welcome. Read it one part at a time or skip directly into the session." },
          { label: "Left panel", text: "View current and previous sessions and search, switch, rename, or delete when available." },
          { label: "Center", text: "Read the conversation, write what you want to say, and review message and attachment status." },
          { label: "Right panel", text: "See the current counselor and response status." }
        ],
        note: "Each session retains the counselor and model selected when it was created. If that counselor already has an unfinished session, choosing to start a new one first moves the old session through its ending flow. Ended sessions are not changed."
      }
    ]
  },
  {
    id: "during",
    label: "During counseling",
    topics: [
      {
        id: "during-session",
        navigationLabel: "Write, send, and retry",
        title: "Write, send, and retry",
        lead: "You do not need to organize a complete story beforehand. Begin with the one thing that feels most important to say now.",
        points: [
          { label: "Send", text: "Select “Send” or press Enter." },
          { label: "New line", text: "Use Shift + Enter or Alt/Option + Enter." },
          { label: "Retry", text: "If a message fails, select “Retry” beside it." },
          { label: "Add material", text: "Files can be saved with a message. TXT and Markdown enter model context. With a vision-capable model, PNG, JPEG, GIF, and WebP images are also sent with the current message for recognition. PDFs and Word files are currently recorded without their contents being read." },
          { label: "Change direction", text: "You can say directly, “I don’t want to discuss this,” or “I want to pause.”" }
        ]
      },
      {
        id: "voice-input",
        navigationLabel: "Use voice input",
        title: "Use voice input",
        lead: "Select the microphone beside the counseling-room composer to turn speech into editable text. Recognition writes only to the composer and never sends automatically, so you can review and revise the text before deciding whether to send it.",
        points: [
          { label: "Local recognition", text: "The bundled offline Chinese-and-English model is used by default. On first use, confirm the notice and allow a few seconds for preparation. Recordings are not uploaded." },
          { label: "Cloud recognition", text: "Under “Settings → Voice input,” you may choose Volcengine, Tencent Cloud, or Alibaba Cloud Model Studio. Ling shows the audio-transfer and possible-billing notice again before use." },
          { label: "Start and stop", text: "Select the microphone to begin dictation and select it again to stop. If you send while listening, Ling first stops dictation and retains the final recognized text." },
          { label: "Shortcut", text: "You may set a key combination that works only while the Ling window is active. Press it once to start and again to stop." }
        ],
        note: "Ling needs operating-system microphone permission. Check the recognized text before sending; you can edit or delete it like any other draft."
      },
      {
        id: "pause-or-end",
        navigationLabel: "Stop, leave, or end",
        title: "Stop, leave, or end",
        lead: "These three actions may look similar, but they represent different session states.",
        comparison: [
          { marker: "Ⅱ", action: "Stop", description: "Stops only the response currently being generated. The session can continue." },
          { marker: "↪", action: "Return to waiting room", description: "Leaves the counseling room temporarily without ending the session." },
          { marker: "×", action: "End this session", description: "After confirmation, makes the session read-only while Ling begins post-session processing and prepares a counselor letter." }
        ],
        note: "Only the most recently ended session with the same counselor can be continued, and only if no other session is unfinished. Unsent text and attachments are kept only during this app run, not after quitting or restarting. Check drafts before ending or starting anew."
      }
    ]
  },
  {
    id: "after",
    label: "After counseling",
    topics: [
      {
        id: "next-session-preparation",
        navigationLabel: "After a session ends",
        title: "After a session ends",
        lead: "Ling processes the session in the background and prepares a counselor letter. These steps are performed by the AI model you configured. No human counselor or supervisor is reviewing, monitoring, or taking over in real time.",
        steps: [
          "The session becomes read-only and background processing begins",
          "AI creates single-session and longer-term conceptualization, an independent review, and a continuity memo",
          "A completed memo may be carried into a later session with the same counselor, according to your settings",
          "When ready, the counselor letter is saved under “Counselor Letters” in the waiting-room bar"
        ],
        note: "If you continue the session, Ling does not use unfinished post-session work or the unfinished letter. The next time you end, it processes the complete updated conversation."
      },
      {
        id: "manage-sessions",
        navigationLabel: "Continue and manage sessions",
        title: "Continue and manage sessions",
        lead: "The left side of the counseling room lists unfinished and past sessions for the current counselor. “Session Records” beside the waiting-room sofa provides a combined view of ended conversations.",
        points: [
          { label: "Switch", text: "Select a session title." },
          { label: "New session", text: "Select “+” in the counseling room. If messages or unsent drafts exist, confirm before ending the old session and starting a new one. Unsent drafts are not carried over. To keep talking, stay in the current session." },
          { label: "Find", text: "When past sessions are present, use the search field above them." },
          { label: "Organize", text: "Open a session’s action menu to rename it and, when the deletion conditions are met, delete it." }
        ],
        note: "After the first message, the session title may automatically change to a short topic."
      },
      {
        id: "past-understanding",
        navigationLabel: "Carry forward earlier understanding",
        title: "Let a new session carry forward earlier understanding",
        lead: "A new session with the same counselor can use the completed and frozen continuity memo from the previous stage, according to your settings. This material is used only in the background. It is not displayed as a counseling summary and is never shared between counselors.",
        steps: [
          "Open “Settings → Counseling Continuity”",
          "Find “Carry the same counselor’s background synthesis into new sessions”",
          "Turn it on or off, then save"
        ],
        note: "Background materials are not settled facts about you. What you say in the present always takes priority, and this setting affects only sessions created afterward."
      },
      {
        id: "session-letter",
        navigationLabel: "Read counselor letters",
        title: "Read counselor letters",
        lead: "After a session formally ends, Ling calls your configured model service to generate a counselor letter. You may remain in the session while it is written or return to the waiting room and open “Counselor Letters” from the bottom bar.",
        points: [
          { label: "Filter", text: "View letters by counselor." },
          { label: "Search", text: "Search by letter, session, or counselor." },
          { label: "Read", text: "Review a preview, then open the complete letter." },
          { label: "Recover", text: "If generation fails, choose “Generate again” in the preview." }
        ]
      }
    ]
  },
  {
    id: "fees",
    label: "Fees and usage",
    topics: [
      {
        id: "fees-and-usage",
        navigationLabel: "Understand fees and usage",
        title: "Understand fees and usage",
        lead: "Ling's official distributor does not charge a software download, counseling, subscription, or usage fee. Any cost comes only from the model provider you connect.",
        points: [
          { label: "Ling itself", text: "The official distributor does not charge a software download or usage fee." },
          { label: "Where fees come from", text: "Generating replies, session materials, and letters calls a model service. With cloud services such as DeepSeek, Kimi, GLM, or Qwen, the provider bills you at its own rates, and its own rules govern credits, discounts, rate limits, and your account." },
          { label: "Local models", text: "When the service really runs on this device, there are no remote model call fees. A LAN or other device address sends requests to that address." },
          { label: "Review usage", text: "Under “Settings → Usage & fees,” review token usage for today and the last 7 days, grouped by provider and model." },
          { label: "How fees work", text: "Ling records only token counts and does not calculate or display currency amounts. Fees are computed from the provider’s official unit prices and appear in your provider account bill." }
        ],
        note: "Provider prices can change. Before using a service, check its website for current pricing, free allowances, and billing rules."
      }
    ]
  },
  {
    id: "more",
    label: "Studio and settings",
    topics: [
      {
        id: "explore-lobby",
        navigationLabel: "Explore the waiting room",
        title: "Explore the waiting room",
        lead: "You are welcome to look around the studio without beginning a session.",
        points: [
          { label: "Reception", text: "Explore prewritten introductions to the studio. Reception small talk does not call a model or create a counseling record. Book a session to discuss your own experiences." },
          { label: "Counselor portraits", text: "Open the three counselor introductions and book a session." },
          { label: "Bookcase", text: "Read fictional stories created for the three counselors." },
          { label: "Garden", text: "Switch between sun and rain and natural sounds, or follow the light on the lake through a breathing practice that can be paused or ended at any time." },
          { label: "Photo", text: "See a studio photograph of the three counselors." },
          { label: "Sofa", text: "Review ended sessions." },
          { label: "Resources Desk", text: "Read product help, crisis support, and the complete informed-consent document." },
          { label: "Bottom bar", text: "Open counselor letters, book counseling, or open settings directly." }
        ]
      },
      {
        id: "data-and-models",
        navigationLabel: "Understand data and model boundaries",
        title: "Understand data and model boundaries",
        lead: "Ling stores settings, profile information, sessions, background materials, and letters on this device by default. It has no Ling-operated cloud sync or telemetry and does not upload them elsewhere by default. Information needed to generate content is still sent to the model service you configure.",
        points: [
          { label: "What may be sent", text: "A model request may include system instructions, your messages, profile excerpts, budget-limited recent conversation and summaries, readable attachments, and completed background materials." },
          { label: "Where it goes", text: "Requests go to the Base URL under “Model Access.” The provider’s own rules determine how request content is stored, used, and deleted, and whether it bills you at its own rates." },
          { label: "What stays local", text: "Sessions, messages, settings, profile information, attachment records, background materials, and letters are stored locally by default. The API key is also stored on this device using operating-system secure storage." },
          { label: "Unlock password", text: "Your unlock password encrypts local sessions, letters, memories, and settings. The recovery code resets the password and restores encrypted backups on a new device." },
          { label: "Voice input", text: "The built-in local recognizer works offline and does not upload recordings. When you select a cloud service, live audio and authentication information are sent to that provider and may be billed to your provider account." },
          { label: "Export and backup", text: "Markdown exports are for reading and exclude the API key, original attachments, and background materials. A complete local backup is encrypted, contains local data for migration and restore, and excludes the API key." }
        ],
        note: "Connect only to a model service you trust. Keep exported files, backups, and the recovery code where only you or people you trust can access them."
      },
      {
        id: "settings",
        note: "Most settings require saving on their page; language changes save immediately. When leaving with pending changes, return to edit or discard them. Existing sessions and records are not automatically translated.",
        navigationLabel: "Adjust settings",
        title: "Adjust settings",
        lead: "Select “Settings” in the waiting-room bar to manage Ling’s model, voice input, profile, language, counseling continuity, data, privacy, and reading preferences.",
        points: [
          { label: "Profile and language", text: "Set how counselors address you, provide optional background, change your avatar, and select Chinese or English." },
          { label: "Model access", text: "Configure DeepSeek or another OpenAI-compatible service, test the connection, and choose models for conversation and post-session tasks." },
          { label: "Usage & fees", text: "Review token usage for today and the last 7 days. Ling itself is free; fees follow the model provider’s pricing." },
          { label: "Voice input", text: "Use the bundled local Chinese-and-English recognizer, or configure Volcengine, Tencent Cloud, or Alibaba Cloud Model Studio. You can also set a shortcut that works while Ling is active." },
          { label: "Counseling continuity", text: "Choose whether a new session with the same counselor carries forward earlier understanding." },
          { label: "Data & privacy", text: "Set the local unlock password and grace window, export sessions and letters, create or restore an encrypted complete local backup, and restore recommended settings." },
          { label: "Interface & reading", text: "Adjust text size and line spacing in counseling and resource views." }
        ]
      },
      {
        id: "troubleshooting",
        navigationLabel: "Troubleshooting",
        title: "Troubleshooting",
        lead: "Use the current page status to check the most common causes first.",
        points: [
          { label: "Cannot send", text: "Confirm that the session is still active. If Ling reports a model connection problem, open “Settings → Model Access” and test the connection." },
          { label: "Cannot find an earlier session", text: "Choose the same counselor from the waiting room and enter the counseling room, then check past sessions on the left. You can also export records under “Data & Privacy.”" },
          { label: "Background processing failed", text: "Select “Process this session again.”" },
          { label: "A letter has not appeared", text: "If the counselor is still writing, wait a little or refresh “Counselor Letters” from the waiting-room bar. If generation failed, choose “Generate again.”" },
          { label: "An attachment was not understood", text: "TXT and Markdown can be read directly. Images require a vision-capable model such as the experimental DeepSeek V4 Flash Vision model. PDFs and Word files are currently recorded without their contents being read." },
          { label: "Voice input does not start", text: "Check the operating-system microphone permission first. For cloud recognition, verify the provider credentials and enabled resources under “Settings → Voice input.”" },
          { label: "Forgot local password", text: "Use the recovery code saved during unlock-password setup. Ling cannot retrieve a password or recovery code that was not saved." },
          { label: "Before restoring a backup", text: "Restore replaces Ling’s current local data on this device and restarts the app. The API key is not included. If the backup came from another device, have the recovery code from when it was created. Confirm the selected file and decide whether current data needs a separate backup first." }
        ],
        note: "You can stop the current response, return to the waiting room, end the session, or close Ling. These actions affect the session and unsent text differently; see “Stop, leave, or end.”"
      }
    ]
  }
];
