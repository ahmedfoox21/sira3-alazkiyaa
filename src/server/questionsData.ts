import { Question, GameMode } from "../types";

export const preloadedQuestions: Question[] = [
  // --- ISLAMIC QUESTIONS (Quran, Prophets, Biography, History) ---
  {
    id: "isl_1",
    category: "إسلاميات (القرآن الكريم)",
    mode: GameMode.Trivia,
    questionText: "ما هي السورة التي تعدل ثلث القرآن الكريم؟",
    options: ["سورة الإخلاص", "سورة الفاتحة", "سورة الكهف", "سورة البقرة"],
    correctAnswer: "سورة الإخلاص"
  },
  {
    id: "isl_2",
    category: "إسلاميات (السيرة النبوية)",
    mode: GameMode.Trivia,
    questionText: "كم كان عمر النبي صلى الله عليه وسلم عندما بعث بالرسالة؟",
    options: ["35 سنة", "40 سنة", "45 سنة", "30 سنة"],
    correctAnswer: "40 سنة"
  },
  {
    id: "isl_3",
    category: "إسلاميات (الصحابة)",
    mode: GameMode.Trivia,
    questionText: "من هو الصحابي الجليل الملقب بأمين هذه الأمة؟",
    options: ["أبو عبيدة بن الجراح", "عمر بن الخطاب", "عثمان بن عفان", "أبو بكر الصديق"],
    correctAnswer: "أبو عبيدة بن الجراح"
  },
  {
    id: "isl_4",
    category: "إسلاميات (التاريخ الإسلامي)",
    mode: GameMode.Trivia,
    questionText: "في أي سنة هجرية وقعت غزوة بدر الكبرى؟",
    options: ["السنة الثانية للهجرة", "السنة الثالثة للهجرة", "السنة الأولى للهجرة", "السنة الرابعة للهجرة"],
    correctAnswer: "السنة الثانية للهجرة"
  },
  {
    id: "isl_5",
    category: "إسلاميات (الأنبياء)",
    mode: GameMode.Trivia,
    questionText: "من هو النبي الذي بعثه الله لقوم عاد؟",
    options: ["هود عليه السلام", "صالح عليه السلام", "شعيب عليه السلام", "لوط عليه السلام"],
    correctAnswer: "هود عليه السلام"
  },

  // --- GENERAL CULTURE & HISTORY ---
  {
    id: "gen_1",
    category: "ثقافة عامة",
    mode: GameMode.Trivia,
    questionText: "ما هو أسرع كائن حي على وجه الأرض؟",
    options: ["الفهد الصياد", "النمر", "الغزال", "صقر الشاهين"],
    correctAnswer: "صقر الشاهين"
  },
  {
    id: "gen_2",
    category: "تاريخ",
    mode: GameMode.Trivia,
    questionText: "من هو القائد المسلم الذي فتح الأندلس؟",
    options: ["طارق بن زياد", "موسى بن نصير", "صلاح الدين الأيوبي", "عقبة بن نافع"],
    correctAnswer: "طارق بن زياد"
  },
  {
    id: "gen_3",
    category: "جغرافيا",
    mode: GameMode.Trivia,
    questionText: "ما هي عاصمة اليابان؟",
    options: ["بكين", "سيول", "طوكيو", "بانكوك"],
    correctAnswer: "طوكيو"
  },
  {
    id: "gen_4",
    category: "علوم",
    mode: GameMode.Trivia,
    questionText: "ما هو الكوكب الأقرب إلى الشمس في المجموعة الشمسية؟",
    options: ["المريخ", "الزهرة", "عطارد", "المشتري"],
    correctAnswer: "عطارد"
  },
  {
    id: "gen_5",
    category: "تكنولوجيا",
    mode: GameMode.Trivia,
    questionText: "ما هو نظام التشغيل الذي تطوره شركة جوجل للمركبات والأجهزة الذكية؟",
    options: ["أندرويد", "آي أو إس", "ويندوز", "لينكس"],
    correctAnswer: "أندرويد"
  },

  // --- ANIME, GAMES, CARS AND ENTERTAINMENT ---
  {
    id: "pop_1",
    category: "أنمي",
    mode: GameMode.Trivia,
    questionText: "من هو بطل أنمي 'ون بيس' الذي يسعى ليكون ملك القراصنة؟",
    options: ["مونكي دي لوفي", "رورونوا زورو", "بورتغاس دي إيس", "شانكس"],
    correctAnswer: "مونكي دي لوفي"
  },
  {
    id: "pop_2",
    category: "ألعاب ورقميات",
    mode: GameMode.Trivia,
    questionText: "ما هي اللعبة الأكثر مبيعاً في تاريخ الألعاب الإلكترونية؟",
    options: ["ماين كرافت", "جراند ثفت أوتو V", "تتريس", "ببجي مبايل"],
    correctAnswer: "ماين كرافت"
  },
  {
    id: "pop_3",
    category: "سيارات",
    mode: GameMode.Trivia,
    questionText: "أي بلد يقع فيه المقر الرئيسي لشركة سيارات تويوتا الشهيرة؟",
    options: ["كوريا الجنوبية", "اليابان", "ألمانيا", "الولايات المتحدة الأمريكية"],
    correctAnswer: "اليابان"
  },
  {
    id: "pop_4",
    category: "رياضة",
    mode: GameMode.Trivia,
    questionText: "من هو اللاعب الذي يحمل الرقم القياسي بأكبر عدد من الكرات الذهبية (Ballon d'Or)؟",
    options: ["كريستيانو رونالدو", "ليونيل ميسي", "بيليه", "دييجو مارادونا"],
    correctAnswer: "ليونيل ميسي"
  },

  // --- EMOJI GUESS QUESTIONS ---
  {
    id: "emo_1",
    category: "أفلام ومسلسلات",
    mode: GameMode.Emoji,
    questionText: "🦁👑  (فيلم ديزني الكلاسيكي الشهير)",
    options: ["الأسد الملك", "مغامرات في الغابة", "نيمو", "طرزان"],
    correctAnswer: "الأسد الملك",
    hint: "قصة الأسد سيمبا ووالده موفاسا"
  },
  {
    id: "emo_2",
    category: "دول وعواصم",
    mode: GameMode.Emoji,
    questionText: "🗼🥖🎨  (دولة أوروبية شهيرة بعاصمتها الرومانسية)",
    options: ["فرنسا", "إيطاليا", "إسبانيا", "بريطانيا"],
    correctAnswer: "فرنسا",
    hint: "برج إيفل والخبز الباجيت المميز"
  },
  {
    id: "emo_3",
    category: "عبارات وأمثال",
    mode: GameMode.Emoji,
    questionText: "⏱️💰  (حكمة عربية شهيرة عن قيمة الزمن)",
    options: ["الوقت كالسيف", "الوقت من ذهب", "العلم نور", "الصبر مفتاح الفرج"],
    correctAnswer: "الوقت من ذهب",
    hint: "الوقت يساوي شيئاً نفيداً"
  },
  {
    id: "emo_4",
    category: "حيوانات وأشياء",
    mode: GameMode.Emoji,
    questionText: "🍼🐈🐾  (حيوان أليف مشهور بموائه وحبه للحليب)",
    options: ["القطة", "الكلب", "الأرنب", "السنجاب"],
    correctAnswer: "القطة",
    hint: "تأكل الفئران وتلعب بالخيوط"
  },
  {
    id: "emo_5",
    category: "شخصيات كرتونية",
    mode: GameMode.Emoji,
    questionText: "🧀🐀🍳  (شخصية الفأر الطباخ الشهير)",
    options: ["راتاتوي (خلطبيطة بالصلصة)", "ميكي ماوس", "جيري", "سبونج بوب"],
    correctAnswer: "راتاتوي (خلطبيطة بالصلصة)",
    hint: "فأر يعشق الطهي ومساعدة ريمي"
  },
  {
    id: "emo_6",
    category: "تكنولوجيا وهواتف",
    mode: GameMode.Emoji,
    questionText: "🍏📱💬  (شركة هواتف أمريكية شعارها تفاحة مقضومة)",
    options: ["أبل (آيفون)", "سامسونج", "هواوي", "شاومي"],
    correctAnswer: "أبل (آيفون)",
    hint: "تنتج نظام iOS"
  }
];
