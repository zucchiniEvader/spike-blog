import { defineConfigWithTheme } from "vitepress";
import { getPosts } from "./theme/utils";
// import { RssPlugin } from "vitepress-plugin-rss";

const base = {
  title: "Spike's Blog",
  description: "Spike的个人博客，记录技术、生活、读书、随笔等内容。",
  baseUrl: "https://blog.fixfishbone.com",
};

async function config() {
  return defineConfigWithTheme<any>({
    title: base.title,
    description: base.description,
    outDir: "dist",
    vite: {
      plugins: [
        // RssPlugin({
        //   title: base.title,
        //   description: base.description,
        //   baseUrl: base.baseUrl,
        //   copyright: "Copyright (c) 2024-present, Demo",
        //   filter: (post) => !post.frontmatter.page,
        // }),
      ],
    },
    head: [
      [
        "meta",
        {
          name: "viewport",
          content:
            "width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no",
        },
      ],
      ["meta", { name: "keywords", content: base.title }],
      [
        "link",
        {
          rel: "icon",
          href: "https://fastly.jsdelivr.net/gh/demo/img/favicon.ico",
        },
      ],
    ],
    themeConfig: {
      avatar: "",
      nav: [
        { text: "首页", link: "/" },
        // { text: '归档', link: '/pages/archives' },
        { text: "关于", link: "/about" },
        // { text: "友链", link: "/pages/links" },
      ],
      socialLinks: [
        {
          icon: "github",
          link: "https://github.com/aholeye",
        },
      ],
      posts: await getPosts("./"),
    },
  });
}

export default config();
