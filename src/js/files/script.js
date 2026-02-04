// Подключение функционала "Чертогов Фрилансера"
import { isMobile } from "./functions.js";
// Подключение списка активных модулей
import { flsModules } from "./modules.js";



/* Custom Select Implementation */
document.addEventListener("DOMContentLoaded", function () {
    const customSelects = document.querySelectorAll(".calculator__select");

    customSelects.forEach((select) => {
        const wrapper = select.closest('.calculator__select-wrapper');
        // Hide original select
        select.style.display = "none";

        // Create the selected item div
        const selectedDiv = document.createElement("div");
        selectedDiv.setAttribute("class", "select-selected");
        // Set initial text from the first option (or placeholder)
        selectedDiv.innerHTML = select.options[select.selectedIndex].innerHTML;
        wrapper.appendChild(selectedDiv);

        // Create the options container
        const itemsDiv = document.createElement("div");
        itemsDiv.setAttribute("class", "select-items select-hide");

        for (let i = 1; i < select.length; i++) { // Start from 1 to skip placeholder if needed, or 0. Logic: usually first is placeholder "Тип ремонта"
            /* For each option in the original select, create a new DIV that will act as an option item: */
            const optionDiv = document.createElement("div");
            optionDiv.innerHTML = select.options[i].innerHTML;
            
            optionDiv.addEventListener("click", function (e) {
                /* When an item is clicked, update the original select box,
                and the selected item: */
                const s = this.parentNode.parentNode.querySelector("select");
                const h = this.parentNode.previousSibling;
                
                for (let i = 0; i < s.length; i++) {
                    if (s.options[i].innerHTML == this.innerHTML) {
                        s.selectedIndex = i;
                        h.innerHTML = this.innerHTML;
                        // Trigger change event on original select if needed
                        s.dispatchEvent(new Event('change'));
                        
                        const y = this.parentNode.getElementsByClassName("same-as-selected");
                        for (let k = 0; k < y.length; k++) {
                            y[k].removeAttribute("class");
                        }
                        this.setAttribute("class", "same-as-selected");
                        break;
                    }
                }
                h.click();
            });
            itemsDiv.appendChild(optionDiv);
        }
        wrapper.appendChild(itemsDiv);

        // Toggle dropdown on click
        selectedDiv.addEventListener("click", function (e) {
            /* When the select box is clicked, close any other select boxes,
            and open/close the current select box: */
            e.stopPropagation();
            closeAllSelects(this);
            this.nextSibling.classList.toggle("select-hide");
            this.classList.toggle("select-arrow-active");
            // Rotate the SVG arrow if it exists as sibling
            const svgArrow = wrapper.querySelector('.calculator__select-arrow');
            if(svgArrow) svgArrow.classList.toggle('active');
        });
    });

    function closeAllSelects(elmnt) {
        /* A function that will close all select boxes in the document,
        except the current select box: */
        const x = document.getElementsByClassName("select-items");
        const y = document.getElementsByClassName("select-selected");
        const arrows = document.querySelectorAll('.calculator__select-arrow');
        
        const xl = x.length;
        const yl = y.length;
        const arr = [];
        
        for (let i = 0; i < yl; i++) {
            if (elmnt == y[i]) {
                arr.push(i)
            } else {
                y[i].classList.remove("select-arrow-active");
                // Remove active class from corresponding arrow
                 const wrapper = y[i].closest('.calculator__select-wrapper');
                 if(wrapper) {
                     const arrow = wrapper.querySelector('.calculator__select-arrow');
                     if(arrow) arrow.classList.remove('active');
                 }
            }
        }
        for (let i = 0; i < xl; i++) {
            if (arr.indexOf(i)) {
                x[i].classList.add("select-hide");
            }
        }
    }

    /* If the user clicks anywhere outside the select box,
    then close all select boxes: */
    document.addEventListener("click", closeAllSelects);


    /* ====================================
       Calculator Logic - Расчёт стоимости ремонта
       ==================================== */
    const form = document.getElementById('calculatorForm');
    const resultBlock = document.getElementById('calc-result');

    // Проверяем, существует ли форма калькулятора на странице
    if (form && resultBlock) {
        // Среднерыночные ставки за м² по работам
        const baseRates = {
            cosmetic: 6000,   // косметический ремонт
            capital: 9500,    // капитальный ремонт
            full: 13000,      // комплексный под ключ
            premium: 20000    // премиальный
        };

        // Надбавки за дополнительные опции (руб./м²)
        const optionAddons = {
            facade: 1500,
            roof: 2000,
            engineering: 2500
        };

        // Очищаем результат при клике на кнопку (до валидации браузера)
        const calcBtn = form.querySelector('.calculator__btn');
        if (calcBtn) {
            calcBtn.addEventListener('click', function() {
                resultBlock.innerHTML = '';
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const area = parseFloat(document.getElementById('area').value || '0');
            const repairType = document.getElementById('repairType').value;
            const materials = document.getElementById('materials').value;
            const facade = document.getElementById('facade').checked;
            const roof = document.getElementById('roof').checked;
            const engineering = document.getElementById('engineering').checked;

            if (!area || area <= 0 || !baseRates[repairType]) {
                resultBlock.innerHTML = '';
                resultBlock.innerHTML = '<p class="calculator__error">Укажите корректную площадь и тип ремонта.</p>';
                return;
            }

            let rate = baseRates[repairType];
            if (facade) rate += optionAddons.facade;
            if (roof) rate += optionAddons.roof;
            if (engineering) rate += optionAddons.engineering;

            const workCost = area * rate;

            // Коэффициент для материалов (приближённо, по рынку 2,5–3х от стоимости работ)
            const materialsCoeff = (materials === 'company') ? 2.7 : 1;
            const totalCost = workCost * materialsCoeff;

            const format = (value) =>
                value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

            resultBlock.innerHTML = `
                <h3>Ориентировочный расчёт</h3>
                <p>Стоимость работ: <strong>${format(workCost)} ₽</strong></p>
                ${materials === 'company'
                    ? `<p>Оценочный бюджет с материалами: <strong>${format(totalCost)} ₽</strong></p>`
                    : `<p class="calculator__result-estimate">При заказе материалов у нас ориентировочный бюджет составит <strong>${format(workCost * 2.7)} ₽</strong></p>`
                }
                <p><small>Расчёт предварительный и не является публичной офертой. Точная стоимость рассчитывается после выезда инженера-сметчика на объект.</small></p>
            `;
        });
    }
});
