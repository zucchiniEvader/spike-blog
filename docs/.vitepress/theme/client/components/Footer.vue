<template>
  <div class="footer">
    <p>
      Copyright © 2015 - {{ currentYear }} Spike | <a href="https://github.com/hellodigua/blog-template">Blog
        Template</a>
    </p>
  </div>
</template>
<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
<style lang="scss" scoped>
.footer {
  margin: 20px auto;
  color: #666;

  p {
    text-align: center;
    font-size: 0.8rem;
  }
}

.footer a:hover {
  text-decoration: underline;
}
</style>
