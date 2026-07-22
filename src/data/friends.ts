export interface FriendLink {
  link: string;
  title: string;
  avatar: string;
  desc: string;
  note?: string;
  inactive?: boolean;
}

export const FRIENDS: FriendLink[] = [
  {
    link: "https://umisaltyu.github.io/",
    title: "UmiSaltYu",
    avatar: "/main/friends/umisaltyu.avif",
    desc: "Night Sky Archives",
    note: "好朋友！结婚！",
  },
  {
    link: "https://ex-tasty.com/",
    title: "開源 lib",
    avatar: "/main/friends/chisato.avif",
    desc: "邪惡與極限伴您一生……🥰",
    note: "博客内容都非常优质，推荐鉴赏",
  },
  {
    link: "https://iffse.eu.org/",
    title: "iff",
    avatar: "/main/friends/iff.avif",
    desc: "Coding & Drawings",
    note: "如果果，是重女",
  },
  {
    link: "https://blog.cloudti.de/",
    title: "云楼汐",
    avatar: "/main/friends/xi.avif",
    desc: "Hinc itur ad astra",
    note: "快更新 Neovim 那篇",
  },
  {
    link: "https://blog.cloverta.top/",
    title: "Cloverta's Blog",
    avatar: "/main/friends/clover.avif",
    desc: "带学牲 | 计算机本科在读 | 死宅",
    note: "用衬线体的都是好人",
  },
  {
    link: "https://a-moment096.github.io/",
    title: "A Moment",
    avatar: "/main/friends/am.avif",
    desc: "A Moment's Rest",
    note: "好看的 Hugo 主题",
  },
  {
    link: "https://shadowrz.github.io/",
    title: "ShadowRZ's Bitfield",
    avatar: "/main/friends/shadow.avif",
    desc: "The NOexistenceN of something?",
    note: "是 NixOS CN 的群友",
  },
  {
    link: "https://www.zeroqing.com/",
    title: "ZeroQing's Blog",
    avatar: "/main/friends/zq.avif",
    desc: "一目洞察网中险，一策化解千般难",
    note: "林檎老师好（不是",
  },
  {
    link: "https://blog.nywerya.xyz/",
    title: "Nywerya's Blog",
    avatar: "/main/friends/nywerya.avif",
    desc: "喜欢音乐，绘画，ACG，编程，硬件，设计，建模，东方Project",
    note: "是画画非常好看的老师！",
  },
];
