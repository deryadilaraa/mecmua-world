const search = document.getElementById('catalogue-search');
search.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  let visible = false;
  document.querySelectorAll('#catalogue section').forEach(section => {
    const categoryMatches = section.dataset.category.includes(query);
    const entries = [...section.querySelectorAll('li')];
    entries.forEach(entry => { entry.hidden = !categoryMatches && !entry.textContent.toLowerCase().includes(query); });
    section.hidden = !categoryMatches && !entries.some(entry => !entry.hidden);
    if (!section.hidden) visible = true;
  });
  document.getElementById('catalogue-empty').hidden = visible;
});
