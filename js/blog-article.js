/**
 * Blog article helpers: share URLs + copy link (runs after optional jQuery .load of footer)
 */
function rdroidInitBlogArticleFooter() {
  var u = encodeURIComponent(window.location.href);
  var t = encodeURIComponent(document.title);
  document.querySelectorAll(".blog-share-link--twitter").forEach(function (a) {
    a.href = "https://twitter.com/intent/tweet?url=" + u + "&text=" + t;
  });
  document.querySelectorAll(".blog-share-link--linkedin").forEach(function (a) {
    a.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + u;
  });
  var btn = document.getElementById("blogCopyPageLink");
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          btn.textContent = "✓";
          setTimeout(function () {
            btn.textContent = "📋";
          }, 1600);
        });
      } else {
        prompt("Copy this link:", url);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", rdroidInitBlogArticleFooter);
window.rdroidInitBlogArticleFooter = rdroidInitBlogArticleFooter;
