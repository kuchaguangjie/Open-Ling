import type { StoryArticle } from "./storyContent";

type EnglishStoryContent = Pick<
  StoryArticle,
  "title" | "excerpt" | "theme" | "readingMinutes" | "imageAlt" | "paragraphs" | "byline"
> & { sourceNote?: string };

export const englishStoryContent: Record<string, EnglishStoryContent> = {
  "half-jar-soup": {
    title: "Half a Jar of Soup",
    excerpt: "She kept accepting everything her mother gave, while rarely asking how much room was left for her own needs.",
    theme: "Guilt · Needs · Boundaries",
    readingMinutes: 7,
    imageAlt: "A glass jar half-filled with winter-melon soup in an afternoon kitchen",
    byline: { author: "Cheng Ling", season: "Summer 2026", location: "Beside the old bookcase" },
    paragraphs: [
      "When Chen Qing first came, she asked, “Do you think I am an unfilial daughter too?” She had not yet told me what had happened, but she was already preparing to be judged.",
      "Every Wednesday, her mother crossed the city by bus to leave a large thermos of soup at her door. Chen Qing often worked late. She drank one bowl, used some for noodles, and eventually poured the rest away. She had asked her mother many times to stop bringing so much.",
      "What hurt was not only the waste. Each new thermos seemed to say that her own account of what she needed did not count. Yet whenever she approached that hurt, she quickly added, “She means well.” Her mother's care seemed to erase Chen Qing's right to feel crowded.",
      "Their pattern was familiar: Chen Qing endured, finally became angry, saw her mother's tears, apologized, and withdrew her request. Guilt showed how much the relationship mattered to her, but it could not by itself determine whether she had done something wrong.",
      "We wondered whether she could allow guilt to be present without immediately taking back what she had said. The next Wednesday she told her mother, “I am happy when you visit. Please keep coming. But I truly cannot finish this much soup.” Her mother replied that even her care had now become unwanted.",
      "Chen Qing almost said, “Forget it.” Instead she paused: “You are not unwanted. There is simply too much soup.” The conversation did not end neatly, and neither woman felt fully understood.",
      "Later Chen Qing found a small honey jar at her mother's home. “If you want to bring soup, use this,” she said. “Make a larger pot if you like. You drink some, and I will take some. You do not have to give me all of it.”",
      "The next thermos felt unexpectedly light. Inside was the small jar, only half full, its lid still tightened with care.",
      "They continued to disagree at times. The change was not that her mother always approved of the boundary. It was that Chen Qing no longer treated another person's disappointment as proof that she had done wrong. The half jar made room for a third position: loving her mother while also respecting her own appetite."
    ]
  },
  "one-received-message": {
    title: "“Received.”",
    excerpt: "The message said almost nothing; anxiety supplied the rest of the story.",
    theme: "Anxiety · Facts and interpretations",
    readingMinutes: 7,
    imageAlt: "A phone displaying a brief message on a sunlit wooden table",
    byline: { author: "Zhou Zhou", season: "Summer 2026", location: "Ripple Pavilion" },
    paragraphs: [
      "Liu Ke showed me a two-word reply from his manager: “Received.” Then he asked, “That period feels cold, doesn't it?”",
      "Rather than decide what the punctuation meant, I asked what he feared would happen next. He believed his manager disliked the proposal, had given up on coaching him, and might exclude him from future projects.",
      "The proposal had taken three days. Seven minutes after sending it, Liu Ke received that single reply. He reopened all twenty-three pages and worked until eleven that night, changing details that had not needed changing.",
      "The next day his manager asked why he had replaced the clearer version. “I was in a meeting,” the manager explained. “I was only letting you know it arrived.” Liu Ke's fear was not groundless—this manager could be abrupt and had reversed decisions before—but one possibility had taken the place of every other one.",
      "The same cycle appeared elsewhere. A friend who did not reply for half a day sent him back through the entire chat. When his wife said, “Let's talk later,” he imagined a long history of disappointment. Checking and repairing briefly made him feel safer, then taught him that every uncertainty required immediate action.",
      "We wrote three headings: what has happened; what I am afraid may happen; what I can do now. The feared outcome remained possible. The point was not to replace it with forced optimism, but to return “possible” to its proper place.",
      "His experiment was to write down the worry and choose the next appropriate time to verify it, rather than checking repeatedly. At first he still reopened a conversation four times and called that failure. Before, he might have checked twenty times. We counted the sixteen checks he had not made.",
      "A month later, his manager wrote “Received.” again. Liu Ke's body tightened. He read it twice, wrote his three headings, chose to ask for feedback the following afternoon, and went downstairs for dinner.",
      "The manager did suggest two revisions. Most of the disasters Liu Ke had imagined did not occur, though that could not guarantee the future. Liu Ke did not become a person without anxiety; he learned to let uncertainty remain unfinished until evidence arrived. One short message no longer decided his whole evening."
    ]
  },
  "always-says-fine": {
    title: "The Person Who Always Says “I'm Fine”",
    excerpt: "She was highly attuned to everyone else's feelings, but rarely heard her own body.",
    theme: "People-pleasing · Roles · Felt experience",
    readingMinutes: 7,
    imageAlt: "An empty wooden chair with a cardigan beside an afternoon dining table",
    byline: { author: "Lin Leshui", season: "Summer 2026", location: "Under the silk tree" },
    paragraphs: [
      "Zhao Xiaohe came after exploding over a cup left beside the sink. Her husband was bewildered: “It is only a cup.” She cried all night and concluded that her temper had become the problem.",
      "During that week a colleague had asked her to cover a weekend shift, a family dinner had been moved past her working hours, and her husband had raised a ten-day holiday visit with his parents. Xiaohe had answered every request with, “I'm fine.”",
      "The exchanged shift meant missing her daughter's first choir performance. When the colleague thanked her for being so easygoing, Xiaohe smiled. Underneath, she had wanted to say, “I cannot switch. I want to be there.” Refusing felt dangerous: it might make her seem selfish and leave her without help in the future.",
      "As a child, she had learned to monitor adults closely. When tension rose between her parents, she lowered the television, took her brother away, and made herself useful. Relatives praised her for never adding to anyone's trouble. Keeping others settled had become part of keeping relationships safe.",
      "When I asked what happened in her body before she agreed, she noticed a brief tightness in her chest. Then “I'm fine” arrived so quickly that it covered the other voice.",
      "She did not need to begin by refusing everyone. Her first practice was a pause: “Let me check my schedule and get back to you.” After sending it, she checked her phone six times and fought the urge to add that she could still help if necessary.",
      "For the next request she replied, “I cannot switch Friday. I could do Sunday afternoon, or help you ask someone else.” Her colleague simply said, “Okay, I will check.” There was no anger, but also no praise. Xiaohe had prepared many explanations and needed none of them.",
      "Not every boundary went smoothly. A relative accused her of rejecting the family when she shortened a holiday visit. Her face burned, and she repeated “three days” anyway. She felt guilty for hours but did not call back to offer ten.",
      "The pause could not guarantee approval. It gave her a chance to distinguish generosity she freely chose from compliance driven by fear. She still sometimes said, “I'm fine,” but she began to remember that she, too, needed a place inside that sentence."
    ]
  },
  "seventeen-minutes-outside": {
    title: "Seventeen Minutes Outside the Door",
    excerpt: "She always arrived seventeen minutes early, as if waiting quietly enough could keep her from becoming a burden.",
    theme: "Waiting · Needs · Fear of being forgotten",
    readingMinutes: 8,
    imageAlt: "An ink-and-color bench, water bottle, and warm light beneath a counseling-room door",
    byline: { author: "Cheng Ling", season: "Spring 2026", location: "North Window Room" },
    paragraphs: [
      "Shen Ru arrived seventeen minutes early for nearly every session. She bought water downstairs, silenced her phone, sat against the wall, and knocked only at the appointed time. She said lateness was disrespectful.",
      "She was exceptionally good at waiting. She waited when meetings moved, clients postponed replies, and a partner forgot a promised call. She rarely reminded anyone. By the time she showed anger, she had usually finished waiting and was ready to leave.",
      "One day the previous session ran four minutes over. I apologized when I opened the door. Shen Ru smiled immediately: “It is completely fine.” During the session she spoke rapidly about an unreliable colleague whose late report she had quietly redone overnight.",
      "I wondered aloud whether the colleague's delay and her four minutes outside my door might be touching the same place. She first said no, then added, “I know you did not mean it.” What had happened before she knew that? She twisted the cap of her bottle and said, “I thought you might have forgotten I was coming.”",
      "Her eyes filled as she insisted it had been only a passing thought. She did not want me to know that she was waiting for me. In her experience, telling someone did not make them less busy; it only exposed how much she wanted to be remembered.",
      "As a child she had waited after school in her mother's noodle shop. She made herself quiet and useful while one rush of customers became another. The one time she asked when they could go home, her mother told her to be considerate because all that work was for her.",
      "No single childhood scene explains a whole adult life. But Shen Ru recognized a familiar position: wait without making trouble, hide the wish to matter, and leave abruptly once the accumulated hurt becomes unbearable. The relationship never gets a chance to respond to the need she did not reveal.",
      "At the next session she was still seventeen minutes early. This time she said, “I was outside wondering whether something might come up for you.” I replied, “This time you brought the waiting into the room.”",
      "She did not learn that nobody would ever forget or disappoint her. She began to add one step before disappearing: ask, tell, or admit that she was waiting. Months later she arrived ten minutes early. The seven minutes were not the important part. She was no longer left outside, guessing alone whether the person behind the door remembered her."
    ]
  },
  "red-pen": {
    title: "The Red Pen",
    excerpt: "His father had been gone for years, but the pen that always found errors first had moved into his mind.",
    theme: "Inner critic · Intergenerational patterns · Choice",
    readingMinutes: 8,
    imageAlt: "A red pen resting beside an old metal stationery box",
    byline: { author: "Cheng Ling", season: "Autumn 2026", location: "Echo Room" },
    paragraphs: [
      "After He Song's father died, he inherited a metal stationery box containing two sharpened pencils, a hardened eraser, and a red pen. His father had used that pen for the shoe-repair shop's accounts—and for correcting his son's school essays.",
      "A score of ninety-two led first to the missing eight points. Praise, his father believed, would prevent improvement. He Song grew into a magazine editor with the same exact eye. Junior editors feared his small, neat comments: “Think again.” “Evidence?” “Is this sentence necessary?”",
      "An intern spent seven days following a street craftsman and wrote until two in the morning. He Song marked the title “sentimental” and crossed out the ending. When she asked whether anything deserved to remain, he replied, “If I tell you it is all good, how will you improve?” The sentence startled him; it belonged to his father.",
      "That evening he reread the piece. A line about the craftsman arranging his hammers made the man vividly present. He wanted to circle it, but managed only the stiff words: “Can stay.”",
      "His father had rarely voiced pride. After the funeral, an old customer said that clippings of He Song's articles had been displayed beneath the glass of the repair machine. His father pointed to them and said, “My son wrote that.” Asked whether he called the work good, the customer remembered only a grammar complaint.",
      "He Song had expected the criticism to die with his father. Instead, it sounded like his own judgment. Whenever he wanted to affirm someone, it asked whether praise would make them careless, whether kindness meant abandoning standards.",
      "Understanding that his father may have known no other way to teach could not restore the words He Song had needed as a child. It did help him recognize what he was repeating.",
      "The next day he told the intern that the ending still needed work. Then he added, “The passage where he arranges the hammers is good. The person becomes alive there. Keep it.” Both of them looked slightly surprised.",
      "He remained a demanding editor. Before lifting the red pen, however, he learned to ask whether a comment came from the manuscript in front of him or from the low table in an old shoe-repair shop. The pen stayed in its box: part of his inheritance, but no longer the only way he had to speak."
    ]
  },
  "tuesday-already-happened": {
    title: "The Tuesday That Already Happened",
    excerpt: "The problem did not vanish; a pot of beef stew helped her recover something that had already worked.",
    theme: "Parent–child conflict · Exceptions · Existing capacity",
    readingMinutes: 8,
    imageAlt: "Homework beside a simmering pot at a small kitchen table",
    byline: { author: "Zhou Zhou", season: "Spring 2026", location: "On the wooden steps" },
    paragraphs: [
      "Tang Min brought a chart of her daughter's homework times. Most evenings followed four steps: reminders at seven-thirty, an unopened schoolbag at eight, shouting by nine, and a locked bedroom door by ten.",
      "Tuesday stood out: the work had finished at nine-twenty. Tang Min called it a coincidence. We decided to examine the coincidence rather than dismiss it.",
      "It had rained, and she came home early. Instead of checking homework, she started tomato-and-beef stew. Her daughter came out and chose the small kitchen table for math. When the pencil stopped, Tang Min wanted to ask why she did not understand, but said only that the stew needed forty more minutes.",
      "Her daughter chose to finish math while it cooked and later brought over one question. Usually Tang Min became anxious and demanded whether she had listened in class. That Tuesday, her hands were busy and the stew could not be hurried.",
      "We named four things that had already happened: Tang Min began with dinner; her daughter chose where to work; a pause in writing was not immediately called laziness; and the daughter asked for help. None was a brilliant new technique.",
      "The following week still contained two arguments. But on Monday Tang Min showered before asking about homework. She talked about noodles or rice instead of pages completed. Her daughter later said, “I cannot write this essay,” without locking the door. Tang Min suggested beginning with three sentences.",
      "She was disappointed that bedtime was still late. On a scale where their usual nights were zero and the stew night was five, she called Monday a four: no immediate interrogation, no locked door, no accusation of laziness, and they cleaned the desk together.",
      "Looking for exceptions did not deny the seriousness of the conflict. It revealed resources already present in their life, not merely techniques borrowed from someone else.",
      "Tang Min kept her chart and added a new column: “What helped tonight?” Friday was no longer blank. The problem remained, but so did evidence that the family was not trapped in only one way of responding."
    ]
  },
  "four-point-dinner": {
    title: "A Four-Out-of-Ten Dinner",
    excerpt: "Life returned without applause: a light, a bowl of noodles, and a cat waiting nearby.",
    theme: "Loss · Scaling · Small recovery",
    readingMinutes: 8,
    imageAlt: "A lit dining table with noodles and a cat waiting on the next chair",
    byline: { author: "Zhou Zhou", season: "Winter 2026", location: "The small fireside table" },
    paragraphs: [
      "Three months after a breakup, Xu Man rated her life a three out of ten. The double bed felt too wide, so she slept on the narrow sofa. Takeout boxes stayed on the coffee table until morning, and some weekends the curtains remained closed.",
      "She did not want another person telling her to pull herself together. We agreed not to discuss that. Instead I asked why her number was three rather than zero.",
      "She was still working, replacing the cat's water, paying rent, answering her mother's calls, and occasionally boiling dumplings instead of ordering food. She dismissed these as bare necessities. Yet necessities do not complete themselves during grief.",
      "Asked what part of her kept doing them, she said, “Maybe the part that does not want to give my whole life over to him.”",
      "Moving from three to four did not require happiness or complete acceptance. Sleeping in the bedroom felt too large. Eating one meal at the dining table felt possible. She imagined turning on the light, using a bowl, washing it afterward, and seeing the cat wait on the next chair.",
      "She did it once. The bright light revealed dust, so she wiped the table. Halfway through her noodles she cried, remembering earlier meals there. Still, she did not carry the bowl back to the sofa, and she washed it afterward.",
      "“Does it count as four if I cried?” she asked. After thinking, she answered herself: “Maybe. Not because I stopped crying, but because I was still sitting at my own table while I cried.”",
      "Recovery was uneven. A wedding invitation from her former partner sent her back to the sofa for days. We counted what remained: she took needed time off, put the invitation away, told a friend she did not want to be alone, and continued caring for the cat.",
      "A scale is not a report card. It helps locate what is still working and what the next visible increment might look like. Xu Man's next point began with one dinner eaten sitting down: an overly bright lamp, a bowl of noodles, and a cat beside her. There was no applause, but life was present."
    ]
  },
  "third-floor-room": {
    title: "The Room on the Third Floor",
    excerpt: "She wanted only the quietest floor, without touching the leaking kitchen, crowded bedroom, or foundation below.",
    theme: "Rushing toward calm · Bypassing pain · Foundations of living",
    readingMinutes: 8,
    imageAlt: "An old hillside house being repaired beneath a bright third-floor window",
    byline: { author: "Lin Leshui", season: "Autumn 2026", location: "Rain-Rest Pavilion" },
    sourceNote: "Inspired by a parable about wanting the top floor without building the floors beneath it.",
    paragraphs: [
      "Liu Qing bought an old one-story house at the foot of a mountain. Its walls peeled, the kitchen leaked, and weeds filled the yard. She asked a carpenter, Old Fan, to add three floors—but told him to ignore the first two.",
      "She wanted only the top room: windows on every side, a couch, a bare table, and complete quiet. The lower floors held smoke, clothes, and old belongings she did not want to face. Old Fan asked where the third floor would stand.",
      "Liu Qing had left a relentless brand-strategy job after a meeting in which she suddenly could not hear anyone speak. Friends suggested medical care and sleep. She believed the perfect silent room would restore her.",
      "Old Fan could hide columns, he said, but he could not make a floor that never touched the ground. Other builders gave the same answer. Work began with the rotted foundation, then the leaking kitchen. When a pipe burst and exposed blackened bricks, Liu Qing stood in the yard and cried.",
      "Perhaps she cried because the house was worse than expected, or because changing locations had not immediately changed her condition. Old Fan did not tell her to be positive. He turned over a bucket so she could sit.",
      "Repair continued through the stove, the bedroom, and the stairs. Liu Qing began sleeping more regularly and saw a doctor in town. She still woke fearing unanswered email and imagined that rest would allow everyone to pass her.",
      "The final room was smaller than her drawing. One tree blocked part of the western view, and winter light reached only a corner of the table. Yet she could live there.",
      "Sometimes she sat upstairs; sometimes she cooked noodles below or talked with friends among boxes on the second floor. When her mind became chaotic, she no longer raced upward to prove she had achieved serenity. She ate, slept, answered what truly needed answering, and admitted what could not be completed yet.",
      "Calm rarely floats unsupported. Beneath it may be a meal, a night's sleep, a medical appointment, a cry, and an honest sentence—the ordinary first and second floors that make the quiet room possible."
    ]
  },
  "last-sesame-flatbread": {
    title: "The Last Sesame Flatbread",
    excerpt: "Whoever spoke first would lose—until their old yellow dog ran into the rain.",
    theme: "Withdrawal · Winning and losing · Shared care",
    readingMinutes: 7,
    imageAlt: "A sesame flatbread on a white plate beside a rainy shop doorway",
    byline: { author: "Lin Leshui", season: "Winter 2026", location: "The old reading room" },
    sourceNote: "Inspired by a parable about a couple who guarded their silence while losing what mattered.",
    paragraphs: [
      "Old Guo and Yulan had sold sesame flatbreads at the end of the lane for twenty-eight years. Their son wanted them to close the shop and move near him. Guo refused, while Yulan secretly packed two boxes of winter clothes.",
      "After another argument, three flatbreads remained. They each ate one. Guo proposed an old game: whoever spoke first could not eat the last one. Yulan pressed her lips together, and so did he.",
      "At first the silence was almost funny. Then each waited for the other to apologize. Wind knocked over the price board. Rain filled the awning. Both noticed and said nothing.",
      "Their ten-year-old yellow dog pushed through the loose back door after a clap of thunder. Yulan shouted its name. Guo ran into the rain and caught it at the end of the lane.",
      "Back inside, with wet trousers and a muddy dog in his arms, Guo laughed: “You spoke first. The flatbread is mine.” Yulan's eyes filled. “You still only remember the flatbread.” His smile disappeared.",
      "After a long silence, he broke the flatbread and placed half in her bowl. “I am not unwilling to move,” he said. “I am afraid I will sit on the balcony all day and nobody will know I can still do anything.”",
      "Yulan fed a piece to the dog. “I do not need the shop closed tomorrow. I am afraid your arm will stop lifting one day and you will still pretend nothing is wrong.”",
      "They opened as usual the next morning. Later they shortened their hours and closed two days a week. Guo initially felt ashamed, as if reduced hours admitted that he was aging. On their first day off, they took the bus to their son's home and returned that evening.",
      "People rarely fight only over bread. Pride may protect a fear; resentment may hold words nobody has risked placing on the table. The person who speaks first does not always lose. A flatbread can be warmed again. Some things, once gone into the rain, may not come back."
    ]
  }
};
