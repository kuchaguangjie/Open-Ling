import type { ReceptionCounselorId } from "../lobbyStorage";

export type ReceptionSmallTalkTopic =
  | "studio"
  | "frontDesk"
  | "resources"
  | "bookcase"
  | "garden"
  | "photo"
  | "booking"
  | "records"
  | "letters"
  | "settings"
  | "voice"
  | "firstWords"
  | "pause"
  | "continuity"
  | "backup"
  | "modelAccess";

export interface ReceptionSmallTalkItem {
  id: string;
  topic: ReceptionSmallTalkTopic;
  lines: string[];
}

const zhSmallTalk: Record<ReceptionCounselorId, ReceptionSmallTalkItem[]> = {
  chengling: [
    {"id": "chengling-firstWords", "topic": "firstWords", "lines": ["第一次进咨询室，不必把经历整理成一篇完整的故事。可以从「今天有点累」或「我还不知道怎么说」开始。你也可以纠正我的理解，决定哪些事情暂时不谈。"]},
    {"id": "chengling-pause", "topic": "pause", "lines": ["只是想歇一会儿，可以返回等待室，之后再预约同一位咨询师就能接着聊。「结束本次咨询」才会进入整理和写信的阶段；两种离开都可以，看你今天需要哪一种。"]},
    {"id": "chengling-continuity", "topic": "continuity", "lines": ["设置里的「咨询连续性」，决定下一场会谈要不要承接同一位咨询师已经整理好的线索。三位咨询师的会谈不会互相共享这些理解；你也可以选择从当下重新开始。"]},
    {"id": "chengling-backup", "topic": "backup", "lines": ["想把这里的记录带到另一台电脑，可以在「数据与隐私」创建完整备份。导出文字适合自己阅读，备份才用于恢复到 App；两者用途不一样，恢复码也请另外妥善保存。"]},
    {"id": "chengling-modelAccess", "topic": "modelAccess", "lines": ["第一次看到 API Key，不认识它也很正常。它是模型平台给你的一串专用密钥，让 Ling 能请那个平台生成回答。「模型接入」里的接入说明，会从获取密钥开始带你一步步设置。"]},

    {
      id: "chengling-studio",
      topic: "studio",
      lines: [
        "前台有时会安静很久。你可以进来就预约，也可以先把每个角落看一遍。两种都很好——在这里，停一停不算耽误。"
      ]
    },
    {
      id: "chengling-resources",
      topic: "resources",
      lines: [
        "资料桌上的文字看起来有点正式，但我很希望它们被认真看见。知情同意不是一道手续，它会告诉你这里能做什么、做不到什么，以及什么时候更适合去找现实中的专业支持。"
      ]
    },
    {
      id: "chengling-bookcase",
      topic: "bookcase",
      lines: [
        "书架里有我们各自写的心理故事，也夹着一些咨询室摘句。碰到哪一句想多停一会儿，就从那里开始。有时候一句话正好说中了你，它只是帮你把模糊的感觉说清楚一点，并不等于替你说完。"
      ]
    },
    {
      id: "chengling-front-desk",
      topic: "frontDesk",
      lines: [
        "点开前台，也可以只是想确认这里会有人回应。你不一定非要带着明确的问题来；想预约、想问问怎么用，或者只聊这一小会儿，都可以。"
      ]
    },
    {
      id: "chengling-garden",
      topic: "garden",
      lines: [
        "如果暂时不想进入一段对话，可以去窗外坐一会儿。花园里的呼吸练习不计时，也不评价你平静下来没有；它只是给你留一点安静的时间。"
      ]
    },
    {
      id: "chengling-photo",
      topic: "photo",
      lines: [
        "相册里有一张三个人围着桌子的照片。周舟后来才发现杯子没有摆齐，乐水说：‘没关系，没摆齐的那一刻也是真的。’我一直很喜欢这句话。"
      ]
    },
    {
      id: "chengling-booking",
      topic: "booking",
      lines: [
        "预约前可以多看一会儿三位咨询师的介绍。不用把这次选择看得太重。现在聊得来的就选 ta，以后不合适也可以换。"
      ]
    },
    {
      id: "chengling-voice",
      topic: "voice",
      lines: [
        "有些话打字时会改了又改，最后反而不像原来想说的。会谈里可以试试离线语音输入，也随时可以回到键盘；哪一种更接近你当下的表达，就用哪一种。"
      ]
    },
    {
      id: "chengling-settings",
      topic: "settings",
      lines: [
        "设置里不只有模型和语音，也可以改称呼、阅读方式和咨询连续性。一个空间怎样称呼你、怎样保存你的资料，这些看似小的地方，其实都和安心有关。"
      ]
    },
    {
      id: "chengling-records",
      topic: "records",
      lines: [
        "结束的会谈会留在沙发旁。你可以回看，也可以给它换一个更贴近自己的名字。记录不是对那段经历的定论，只是在你需要时，替它留一个可以找回的位置。"
      ]
    },
    {
      id: "chengling-letters",
      topic: "letters",
      lines: [
        "会谈后的信不必当天读。有些话刚结束时太近，隔一晚再看，位置会不一样。它会留在底栏，不催你，也不会因为晚一点打开就失效。"
      ]
    }
  ],
  zhouzhou: [
    {"id": "zhouzhou-firstWords", "topic": "firstWords", "lines": ["不用先选对一个心理学术语才开口。说一件最近发生的事，或者说你希望今天聊完能清楚一点什么，都可以。一次谈一个小问题，也算一次完整的开始。"]},
    {"id": "zhouzhou-pause", "topic": "pause", "lines": ["三个按钮可以这样区分：停止，只停这次回答；返回等待室，稍后还能接着聊；结束本次咨询，会进入整理和写信。新开一场则会结束同一咨询师的旧会谈，确认前先看看有没有没发出的文字。"]},
    {"id": "zhouzhou-continuity", "topic": "continuity", "lines": ["新会谈承接的是已经完成的咨询备忘录，不是把全部旧聊天原封不动重读。整理需要时间，也可能失败；重要的背景可以直接再告诉咨询师，不必猜它记住了多少。"]},
    {"id": "zhouzhou-backup", "topic": "backup", "lines": ["换电脑前记住两件事：创建完整备份，保管恢复码。API Key 不在备份里，新设备需要重新填写。只导出 Markdown 能读记录，但不能把整套资料恢复进 Ling。"]},
    {"id": "zhouzhou-modelAccess", "topic": "modelAccess", "lines": ["模型、服务商、API Key 看着像三个门槛，其实是选谁提供回答、用哪个 AI、用什么凭据连接。第一次保留预设，照接入说明做即可。用量与费用页记录消耗，实际账单看服务商平台。"]},

    {
      id: "zhouzhou-studio",
      topic: "studio",
      lines: [
        "第一次进来，很容易先把所有发光的地方扫一遍，再决定从哪儿开始。很正常。要记的话，两个就够：资料在桌上，预约在下面。剩下的慢慢看。"
      ]
    },
    {
      id: "zhouzhou-booking",
      topic: "booking",
      lines: [
        "第一次预约会依次选咨询师、设置本地资料密码、连接模型、确认知情说明，再进入咨询室。听起来不少，但每一步都可以停；如果已有未结束的会谈，系统也会先带你回去，不会偷偷再开一场。"
      ]
    },
    {
      id: "zhouzhou-resources",
      topic: "resources",
      lines: [
        "想先弄清规则的话，资料桌最省时间。怎么使用、资料怎么处理、AI 咨询的边界，以及紧急时该去哪里找帮助，都分开放好了。先看明白，通常比边走边猜轻松。"
      ]
    },
    {
      id: "zhouzhou-bookcase",
      topic: "bookcase",
      lines: [
        "书架里是我们三个人各自写的心理故事，旁边也会换一条咨询室摘句。可以按咨询师挑，也可以只看题目。它们不是标准答案；如果读完只让你更清楚‘这不是我的情况’，也不算白读。"
      ]
    },
    {
      id: "zhouzhou-front-desk",
      topic: "frontDesk",
      lines: [
        "前台没有隐藏问答，也不会测试你是不是‘准备好了’。你可以直接预约，也可以只问一件很具体的事。问题越具体越好——当然，一时不知道要问什么也算一种具体情况。"
      ]
    },
    {
      id: "zhouzhou-garden",
      topic: "garden",
      lines: [
        "花园里没有打卡，也没有‘连续呼吸七天’这种任务。你可以选晴天或雨天，跟着光呼吸几次，也可以什么都不练，只离开信息多的地方两分钟。"
      ]
    },
    {
      id: "zhouzhou-photo",
      topic: "photo",
      lines: [
        "相册那天，乐水说‘自然一点’，程灵整理了衣领，我负责确认照片没有拍糊。最后大家对‘自然’各有一套定义，好在三张都留下了。"
      ]
    },
    {
      id: "zhouzhou-voice",
      topic: "voice",
      lines: [
        "脑子比手快的时候，可以用语音输入。默认有本地离线识别，不需要为了说一句话先开云端服务；识别不顺手就换回键盘，工具不用讲忠诚。"
      ]
    },
    {
      id: "zhouzhou-settings",
      topic: "settings",
      lines: [
        "设置里有一项很不浪漫但很有用：本地备份。会谈和来信主要保存在这台设备上，换电脑以前记得导出。放心，我不会把它变成每日提醒。"
      ]
    },
    {
      id: "zhouzhou-records",
      topic: "records",
      lines: [
        "会谈记录可以搜索、重命名和删除，并且按咨询师分开。删除前会再问一次——不是怀疑你的决定，只是替手滑多留一道门。"
      ]
    },
    {
      id: "zhouzhou-letters",
      topic: "letters",
      lines: [
        "会谈结束后，来信可能会显示‘正在写’。不用守着刷新，去做别的就好；写完它还在原处，失败也会明说，不让你靠猜。"
      ]
    }
  ],
  linleshui: [
    {"id": "linleshui-firstWords", "topic": "firstWords", "lines": ["有时我们带着一团还没有名字的感受来。可以从一句日常的话开始，也可以慢慢写。你不用为了适应这个工具，把自己的表达变成某种标准格式。"]},
    {"id": "linleshui-pause", "topic": "pause", "lines": ["回等待室坐坐，不等于结束一场谈话。再选择同一位咨询师，可以回到未结束的会谈。若今天想告一段落，再选择「结束本次咨询」，让它慢慢整理。"]},
    {"id": "linleshui-continuity", "topic": "continuity", "lines": ["同一位咨询师可以按你的选择，在下一次会谈承接先前整理好的线索。那些理解也可能有偏差，你可以随时说「不是这样」。记录留下的是一段路，不是对你的定义。"]},
    {"id": "linleshui-backup", "topic": "backup", "lines": ["本机保存意味着资料主要跟着这台设备，不会自动出现在另一台电脑。需要搬家时，设置里的完整备份可以带上它们；恢复前也先给当前资料留一份。"]},
    {"id": "linleshui-modelAccess", "topic": "modelAccess", "lines": ["你可以选择网络上的模型服务，也可以连接已经在本机启动的模型。等待室的故事和花园不用先配好模型，想正式聊时再照接入说明完成连接也来得及。"]},

    {
      id: "linleshui-studio",
      topic: "studio",
      lines: [
        "等待室里，我很喜欢窗边那块安静的光。它不催人进门，也不劝人留下。知道自己随时可以走，反而更清楚现在想不想坐一会儿。"
      ]
    },
    {
      id: "linleshui-garden",
      topic: "garden",
      lines: [
        "花园可以是晴天，也可以听雨。雨天也不妨碍在里面坐一会儿。天气不用负责让人好起来，它只是让此刻有了一点声音。"
      ]
    },
    {
      id: "linleshui-front-desk",
      topic: "frontDesk",
      lines: [
        "我们轮流看前台，说话的方式会变，入口却一直在原处。值班的人是谁都不用特别适应。你想去哪儿，直接去就好。"
      ]
    },
    {
      id: "linleshui-resources",
      topic: "resources",
      lines: [
        "资料桌上的知情同意像一道门框：它不是要把人挡在外面，而是把这里能做什么、不能做什么说清楚。"
      ]
    },
    {
      id: "linleshui-bookcase",
      topic: "bookcase",
      lines: [
        "书架里有我们三个人写的心理故事，也有一些咨询室摘句。读故事不一定是为了在别人身上找到自己；有时只是借别人的一小段路，回头看见自己站在哪里。"
      ]
    },
    {
      id: "linleshui-photo",
      topic: "photo",
      lines: [
        "相册里有一张杯子没有对齐。周舟拍完还是把它们摆正了，却没有要求重拍。她大概也觉得，有些整齐可以留到下次。"
      ]
    },
    {
      id: "linleshui-booking",
      topic: "booking",
      lines: [
        "预约时可以先读三位咨询师的介绍，再选此刻愿意交谈的人。今天的选择只适合今天。开始以前，模型连接和知情说明会等你确认。"
      ]
    },
    {
      id: "linleshui-voice",
      topic: "voice",
      lines: [
        "有时手跟不上话，有时话又跟不上心。会谈里可以用语音，也可以一字一句慢慢写。哪条路说顺了，就走哪条。"
      ]
    },
    {
      id: "linleshui-settings",
      topic: "settings",
      lines: [
        "称呼、语言、声音、阅读方式和资料备份都可以在设置里调整。工具不用一次定好。人会变，用法也可以跟着变。"
      ]
    },
    {
      id: "linleshui-records",
      topic: "records",
      lines: [
        "旧会谈放在沙发旁。偶尔回看，会发现当时以为过不去的地方已经挪了半步；也可能仍在原处。记录只让你看见变化，不替你给变化打分。"
      ]
    },
    {
      id: "linleshui-letters",
      topic: "letters",
      lines: [
        "咨询师的信会留在等待室。有人当时读合适，有人要隔几天才读得进去。信放在那里，不会因为你晚一点打开就生气。"
      ]
    }
  ]
};

const enSmallTalk: Record<ReceptionCounselorId, ReceptionSmallTalkItem[]> = {
  chengling: [
    {"id": "chengling-firstWords", "topic": "firstWords", "lines": ["Your first session does not need a complete life story. You can begin with “I am tired today” or “I do not know how to say it yet.” You can correct my understanding and decide what you do not want to discuss."]},
    {"id": "chengling-pause", "topic": "pause", "lines": ["If you need a break, return to the waiting room and select the same counselor later to continue. End this session when you want it organized and a letter prepared. Choose whichever kind of pause you need today."]},
    {"id": "chengling-continuity", "topic": "continuity", "lines": ["Counseling continuity controls whether a new session draws on completed notes from the same counselor. These understandings are not shared between the three counselors. You can also choose to start with the present."]},
    {"id": "chengling-backup", "topic": "backup", "lines": ["To move your records to another computer, create a full backup under Data and privacy. Text exports are for reading; backups restore information into Ling. Keep the recovery code separately and securely."]},
    {"id": "chengling-modelAccess", "topic": "modelAccess", "lines": ["An API key may be an unfamiliar term. It is a special string from a model platform that lets Ling ask that platform for responses. The connection guide in Model connection walks you through getting a key and setting it up."]},

    { id: "chengling-studio", topic: "studio", lines: ["Reception can stay quiet for a long time. You may book right away or look into every corner first. Both are fine. Pausing here does not count as wasting time."] },
    { id: "chengling-resources", topic: "resources", lines: ["The papers at the Resources Desk look formal, but I hope they are read carefully. Informed consent explains what this studio can and cannot do, and when support from a person in the real world may be more appropriate."] },
    { id: "chengling-bookcase", topic: "bookcase", lines: ["The bookcase holds psychological stories written from each of our perspectives, along with short reflections from the counseling room. Start with whichever one you want to stay with for a moment. Sometimes a line lands because it puts a faint feeling into words; it does not finish your story."] },
    { id: "chengling-front-desk", topic: "frontDesk", lines: ["Selecting reception can simply be a way to check that someone will answer. You do not need a fully formed question. Booking, asking how something works, or talking for this one small moment are all welcome."] },
    { id: "chengling-garden", topic: "garden", lines: ["If you do not want to enter a conversation yet, you can sit outside for a while. The garden breathing practice has no timer and does not judge whether you became calm; it just gives you a little quiet time."] },
    { id: "chengling-photo", topic: "photo", lines: ["One album photo shows the three of us around the table. Zhou Zhou noticed afterward that the cups were uneven. Leshui said, ‘That unarranged moment was real too.’ I have always liked that line."] },
    { id: "chengling-booking", topic: "booking", lines: ["You can spend time with all three counselor introductions before booking. The choice does not have to be permanent. Pick the person you feel like talking with now; you can choose again later."] },
    { id: "chengling-voice", topic: "voice", lines: ["Some words get edited so many times while typing that they no longer sound like the original thought. You can try offline voice input and return to the keyboard at any time. Use whichever feels closer to what you mean now."] },
    { id: "chengling-settings", topic: "settings", lines: ["Settings is not only for models and voice. You can change your name, reading display, and counseling continuity. How a space addresses you and keeps your information can be part of feeling at ease here."] },
    { id: "chengling-records", topic: "records", lines: ["Completed sessions remain beside the sofa. You can revisit them or give one a name that fits better. A record is not a verdict on the experience; it simply leaves a place where you can find it again."] },
    { id: "chengling-letters", topic: "letters", lines: ["A counselor letter does not have to be read the same day. Some words feel different after a night has passed. The letter will remain in the bottom bar without hurrying you."] }
  ],
  zhouzhou: [
    {"id": "zhouzhou-firstWords", "topic": "firstWords", "lines": ["You do not need the right psychological term to begin. Describe a recent event or something you hope to understand better today. One small question is enough for a start."]},
    {"id": "zhouzhou-pause", "topic": "pause", "lines": ["Stop pauses the current answer. Return to the waiting room lets you continue later. End this session starts organization and letter writing. Starting a new one ends the old session with that counselor, so check unsent text before confirming."]},
    {"id": "zhouzhou-continuity", "topic": "continuity", "lines": ["New sessions use completed consultation notes rather than rereading every old message. Organization takes time and can fail. You can always repeat important background instead of guessing how much the counselor remembers."]},
    {"id": "zhouzhou-backup", "topic": "backup", "lines": ["Before changing computers, create a full backup and keep its recovery code. API keys are excluded and must be entered on the new device. Markdown exports are readable records, but cannot restore the full workspace into Ling."]},
    {"id": "zhouzhou-modelAccess", "topic": "modelAccess", "lines": ["The provider supplies responses, the model is the specific AI, and the API key is your connection credential. Start with a preset and follow the connection guide. Usage and costs tracks consumption; the provider has your actual bill."]},

    { id: "zhouzhou-studio", topic: "studio", lines: ["The first time you arrive, it is easy to scan every glowing point before deciding where to begin. That is normal. Two places are worth remembering: resources are on the desk, and booking is below. The rest can wait."] },
    { id: "zhouzhou-booking", topic: "booking", lines: ["Your first booking covers choosing a counselor, protecting local data with a password, connecting a model, confirming informed consent, and entering the room. You can stop at every step. If a session is unfinished, Ling takes you back instead of quietly creating another."] },
    { id: "zhouzhou-resources", topic: "resources", lines: ["If you prefer knowing the rules first, the Resources Desk saves time. Guidance, data handling, AI-counseling boundaries, and urgent support are separated clearly. Reading first is usually easier than guessing on the way."] },
    { id: "zhouzhou-bookcase", topic: "bookcase", lines: ["The bookcase has psychological stories written by all three of us, plus a rotating counseling-room reflection. Choose by counselor or just by title. They are not answer keys. If reading one only helps you say, ‘That is not my situation,’ it still clarified something."] },
    { id: "zhouzhou-front-desk", topic: "frontDesk", lines: ["Reception has no hidden quiz about whether you are ready. You can book directly or ask one concrete question. The more specific, the better—although not knowing what to ask is also a fairly specific situation."] },
    { id: "zhouzhou-garden", topic: "garden", lines: ["The garden has no check-in streak and no seven-day breathing challenge. Choose sun or rain, follow the light for a few breaths, or practice nothing and simply leave the busy screen for two minutes."] },
    { id: "zhouzhou-photo", topic: "photo", lines: ["On album day, Leshui said, ‘Act natural,’ Cheng Ling straightened her collar, and I checked that the photo was in focus. We each had a different definition of natural. Fortunately, all three photos survived."] },
    { id: "zhouzhou-voice", topic: "voice", lines: ["When your mind is faster than your hands, voice input can help. Local offline recognition is available by default, so you do not need a cloud service for one sentence. If it is awkward, switch back. Tools do not require loyalty."] },
    { id: "zhouzhou-settings", topic: "settings", lines: ["Settings contains something unromantic but useful: local backup. Sessions and letters mainly stay on this device, so export before changing computers. I promise not to turn this into a daily reminder."] },
    { id: "zhouzhou-records", topic: "records", lines: ["Session records can be searched, renamed, and deleted, and they stay separated by counselor. Deletion asks once more—not because it doubts you, but because fingers occasionally slip."] },
    { id: "zhouzhou-letters", topic: "letters", lines: ["After a session, a letter may show ‘writing.’ You do not need to guard the refresh button. Go do something else; it will still be there when finished, and a failure will be stated plainly."] }
  ],
  linleshui: [
    {"id": "linleshui-firstWords", "topic": "firstWords", "lines": ["Sometimes we arrive with a feeling that has no name yet. Begin with an everyday sentence or write slowly. You do not need to turn your expression into a standard format for this tool."]},
    {"id": "linleshui-pause", "topic": "pause", "lines": ["Sitting in the waiting room does not end your conversation. Select the same counselor to return to an unfinished session. When you want to close for today, choose End this session and let it be organized."]},
    {"id": "linleshui-continuity", "topic": "continuity", "lines": ["You can let the same counselor draw on completed notes next time. Those understandings can be mistaken, and you can always say “That is not how it is.” A record marks part of a journey; it does not define you."]},
    {"id": "linleshui-backup", "topic": "backup", "lines": ["Local storage means your information stays with this device; it does not appear automatically on another computer. Full backups in Settings can carry it with you. Before restoring, make a separate backup of the current information too."]},
    {"id": "linleshui-modelAccess", "topic": "modelAccess", "lines": ["You can connect an online model service or a model already running on your device. Stories and the garden do not require a model connection. Follow the connection guide when you are ready for a formal session."]},

    { id: "linleshui-studio", topic: "studio", lines: ["I like the quiet patch of light by the waiting-room window. It does not push anyone toward the door or ask them to stay. Knowing you are free to leave can make it clearer whether you want to sit for a while."] },
    { id: "linleshui-garden", topic: "garden", lines: ["The garden can be sunny, or you can listen to rain. Rain does not stop you from sitting there for a while. The weather does not have to make anyone feel better; it just gives the moment a little sound."] },
    { id: "linleshui-front-desk", topic: "frontDesk", lines: ["We take turns at reception, so the way we speak changes while the entrances stay where they are. Whoever is on duty, you do not need to adjust to them. Go wherever you want to go."] },
    { id: "linleshui-resources", topic: "resources", lines: ["Informed consent at the Resources Desk is like a doorframe. It is not there to keep people out; it makes clear what this place can and cannot do."] },
    { id: "linleshui-bookcase", topic: "bookcase", lines: ["The bookcase holds psychological stories by the three of us, with a few reflections from the counseling room. We do not always read a story to find ourselves in someone else. Sometimes we borrow a short stretch of another person's road and look back at where we are standing."] },
    { id: "linleshui-photo", topic: "photo", lines: ["One album photo has cups that do not line up. Zhou Zhou arranged them afterward but did not ask for another photo. Perhaps she felt the neat version could wait."] },
    { id: "linleshui-booking", topic: "booking", lines: ["You can read all three introductions and choose the person you feel like speaking with now. Today's choice only has to fit today. Model connection and informed consent will wait for your confirmation before you enter."] },
    { id: "linleshui-voice", topic: "voice", lines: ["Sometimes hands cannot keep up with words, and sometimes words cannot keep up with the heart. You may speak or write one character at a time. Use whichever route makes saying it easier."] },
    { id: "linleshui-settings", topic: "settings", lines: ["Name, language, voice, reading display, and backup can all be adjusted in Settings. A tool does not need to be fixed forever. People change, and the way they use it can change too."] },
    { id: "linleshui-records", topic: "records", lines: ["Old sessions remain beside the sofa. Looking back, you may find that something once immovable has shifted half a step—or that it has not. Records let you notice change without grading it."] },
    { id: "linleshui-letters", topic: "letters", lines: ["Counselor letters remain in the waiting room. Some are right to read immediately; others can only be received days later. A letter will not be offended because you opened it late."] }
  ]
};

export function getReceptionSmallTalkItems(
  locale: "zh-CN" | "en-US",
  counselorId: ReceptionCounselorId,
  options: { hasEndedSession: boolean } = { hasEndedSession: false }
) {
  const source = locale === "en-US" ? enSmallTalk : zhSmallTalk;
  return source[counselorId].filter((item) => {
    if (item.topic === "records" || item.topic === "letters") return options.hasEndedSession;
    return true;
  });
}

export function getReceptionSmallTalkIntro(locale: "zh-CN" | "en-US") {
  return locale === "en-US" ? [
    "Small talk at reception is a set of short, prewritten introductions to the studio. It does not call an AI service or create a counseling record. Choose ‘More’ to explore, or leave whenever you like.",
    "A formal session starts through ‘Book a session’. Its record is stored on this device; when using an API service, content needed for responses is sent to your chosen provider. The Resources Desk explains this in more detail."
  ] : [
    "前台的「随便聊聊」是准备好的工作室小介绍，不会调用 AI 服务，也不会生成咨询记录。点「再多聊聊」可以听下一条，想离开时随时结束就好。",
    "想聊自己的经历，可以从「预约咨询」进入正式会谈。会谈记录保存在这台设备上；使用 API 服务时，生成回答需要的内容会发送给你选择的服务商，资料桌有更完整的说明。"
  ];
}
