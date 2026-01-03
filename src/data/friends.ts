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
    avatar: "/friends/umisaltyu.avif",
    desc: "Night Sky Archives",
  },
  {
    link: "https://iffse.eu.org/",
    title: "iff",
    avatar: "/friends/iff.avif",
    desc: "Coding & Drawings",
    note: "kks：如果果，是重女",
  },
  {
    link: "https://ex-tasty.com/",
    title: "冬夜",
    avatar: "/friends/chisato.avif",
    desc: "邪惡與極限伴您一生……🥰\n我要帶領尊貴的您前往極限的旅程和極限的時光",
  },
  {
    link: "https://blog.cloudti.de/",
    title: "云楼汐",
    avatar: "/friends/xi.avif",
    desc: '"Hinc itur ad astra"\nAlgorithm, Computer and Math',
  },
  {
    link: "https://0o0.codeberg.page/",
    title: "沉渊覆雪",
    avatar: "/friends/chen.avif",
    desc: "愿走向深渊的旅途里可以遇见无限美好",
  },
  {
    link: "https://cloverta.top/",
    title: "ClovertaTheTrilobita",
    avatar: "/friends/clover.avif",
    desc: "带学牲 | 计算机本科在读 | 死宅 | I use Arch btw",
    note: "kks：主题好看，赞赏",
  },
  {
    link: "https://a-moment096.github.io/",
    title: "A Moment",
    avatar: "/friends/am.avif",
    desc: "A Moment's Rest",
    note: "kks：同样赞赏",
  },
];
