// Event listener for the "Learn More" button
document.getElementById('learn-more-btn').addEventListener('click', function() {
    var extraInfo = document.getElementById('extra-info');
    if (extraInfo.style.display === 'none') {
      extraInfo.style.display = 'block'; 
      this.textContent = 'Show Less'; 
    } else {
      extraInfo.style.display = 'none'; 
      this.textContent = 'Learn More'; 
    }
  });
  