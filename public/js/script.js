(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

function likeButton(heart) {
  let card = heart.closest(".card");
  let likes = card.querySelector(".likes");
  let postId = card.getAttribute("data-post-id");
  let currentLikes = parseInt(likes.textContent.split(" ")[0].replace(",", ""));
  let isLiked = heart.src.includes("heart_red.png");

  if (!isLiked) {
    heart.src = "/images/heart_red.png";
    currentLikes += 1;
  } else {
    heart.src = "/images/heart.png";
    currentLikes -= 1;
  }

  likes.innerHTML = `${currentLikes.toLocaleString()} likes`;

  // Send AJAX request to the server to update the likes in the database
  fetch(`/posts/${postId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isLiked: !isLiked }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Likes updated successfully in the database");
      } else {
        console.error("Failed to update likes in the database");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// function likeButton(heart) {
//   // Log the clicked heart element
//   console.log("Clicked heart:", heart);

//   // Find the parent card element
//   let card = heart.closest(".card");
//   console.log("Parent card:", card);

//   // Get the likes element within the same card
//   let likes = card.querySelector(".likes");
//   console.log("Likes element:", likes);

//   // Get the current number of likes from the text content
//   let currentLikes = parseInt(likes.textContent.split(" ")[0].replace(",", ""));
//   console.log("Current likes:", currentLikes);

//   // Update the heart icon and the likes count
//   if (heart.src.includes("heart.png")) {
//     heart.src = "images/heart_red.png";
//     currentLikes += 1;
//   } else {
//     heart.src = "images/heart.png";
//     currentLikes -= 1;
//   }

//   // Update the likes text
//   likes.innerHTML = `${currentLikes.toLocaleString()} likes`;
//   console.log("Updated likes:", currentLikes);
// }

// function likeButton() {
//   let heart = document.querySelector(".heart");
//   let likes = document.querySelector(".likes");
//   if (heart.src.match("images/heart.png")) {
//     heart.src = "images/heart_red.png";
//     likes.innerHTML = "5,490 likes";
//   } else {
//     heart.src = "images/heart.png";
//     likes.innerHTML = "5,489 likes";
//   }
// }
