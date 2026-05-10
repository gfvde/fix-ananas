import re

with open('footer.jinja', 'r') as f:
    content = f.read()

# Replace the divider and payment/legal section
old_legal = """  {# ── Divider ───────────────────────────────────────────────────────────── #}
  <div class="mx-6 md:mx-20" style="border-top: 1px solid {{ divider_color }};"></div>

  {# ── Payment methods + Legal badges ───────────────────────────────────── #}
  {% set has_payment = store.settings.checkout.payment_methods | length > 0 or store.settings.checkout.shipping_methods | length > 0 %}
  {% set has_legal = store.settings.contact.business_center or store.settings.general.tax_settings.is_certificate_visible or store.settings.general.tax_settings.tax_number or store.settings.general.commercial_registration_number %}
  {% if has_payment or has_legal %}
    <div class="px-6 md:px-20 py-5 flex flex-wrap items-center gap-3">

      {% for payment_method in store.settings.checkout.payment_methods %}
        <div class="flex items-center justify-center h-8 px-2 bg-white rounded-md">
          <img
            src="{{ image_url(payment_method.icon, w=64, h=32, q=100) }}"
            height="20"
            loading="lazy"
            alt="{{ payment_method.name }}"
            class="h-5 w-auto object-contain"
          />
        </div>
      {% endfor %}

      {% for shipping_method in store.settings.checkout.shipping_methods %}
        <div class="flex items-center justify-center h-8 px-2 bg-white rounded-md">
          <img
            src="{{ image_url(shipping_method.icon, w=64, h=32, q=100) }}"
            height="20"
            loading="lazy"
            alt="{{ shipping_method.name }}"
            class="h-5 w-auto object-contain"
          />
        </div>
      {% endfor %}

      {% if store.settings.general.commercial_registration_number %}
        <div class="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs" style="border: 1px solid {{ divider_color }}; color: {{ text_color }};">
          <svg viewBox="0 0 16 16" fill="none" class="size-4 shrink-0" style="color: #c8a96e;">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5 8.5l2 2 4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ store.settings.general.commercial_registration_number }}</span>
        </div>
      {% endif %}

      {% if store.settings.contact.business_center %}
        <a
          href="https://eauthenticate.saudibusiness.gov.sa/certificate-details/{{ store.settings.contact.business_center }}"
          target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition-opacity hover:opacity-80"
          style="border: 1px solid {{ divider_color }}; color: {{ text_color }};"
        >
          <img
            src="{{ image_url(('images/business_center.png' | asset_url), w=48, q=85, f='auto') }}"
            height="20"
            loading="lazy"
            alt="{{ _('Business Center') }}"
            class="h-5 w-auto object-contain"
          />
          <span>{{ store.settings.contact.business_center }}</span>
        </a>
      {% endif %}

      {% if store.settings.general.tax_settings.is_certificate_visible %}
        <a
          {% if store.settings.general.tax_settings.tax_registration_certificate %}
            href="{{ store.settings.general.tax_settings.tax_registration_certificate }}"
            target="_blank" rel="noopener noreferrer"
          {% endif %}
          class="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition-opacity hover:opacity-80"
          style="border: 1px solid {{ divider_color }}; color: {{ text_color }};"
        >
          <img
            src="{{ image_url(('images/vat-certificate.png' | asset_url), w=64, q=85, f='auto') }}"
            height="20"
            loading="lazy"
            alt="{{ _('VAT Certificate') }}"
            class="h-5 w-auto object-contain"
          />
          {% if store.settings.general.tax_settings.tax_number %}
            <span>{{ store.settings.general.tax_settings.tax_number }}</span>
          {% endif %}
        </a>
      {% endif %}

    </div>
    <div class="mx-6 md:mx-20" style="border-top: 1px solid {{ divider_color }};"></div>
  {% endif %}"""

new_legal = """  {# ── Payment methods + Legal badges ───────────────────────────────────── #}
  {% set has_payment = store.settings.checkout.payment_methods | length > 0 or store.settings.checkout.shipping_methods | length > 0 %}
  {% set has_legal = store.settings.contact.business_center or store.settings.general.tax_settings.is_certificate_visible or store.settings.general.tax_settings.tax_number or store.settings.general.commercial_registration_number %}
  {% if has_payment or has_legal %}
    <div class="px-6 md:px-20 py-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">

      {# Legal Badges #}
      <div class="flex flex-wrap justify-center md:justify-start items-center gap-6">
        {% if store.settings.general.commercial_registration_number %}
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-full" style="background-color: {{ icon_bg }}; color: {{ heading_color }};">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <div class="flex flex-col items-start gap-1">
              <span class="text-[10px]" style="color: {{ text_color }};">{{ _('رقم السجل التجاري') }}</span>
              <span class="text-xs font-semibold" style="color: {{ heading_color }};">{{ store.settings.general.commercial_registration_number }}</span>
            </div>
          </div>
        {% endif %}

        {% if store.settings.contact.business_center %}
          <a href="https://eauthenticate.saudibusiness.gov.sa/certificate-details/{{ store.settings.contact.business_center }}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div class="flex items-center justify-center w-8 h-8 rounded-full" style="background-color: {{ icon_bg }}; color: {{ heading_color }};">
              <img src="{{ image_url(('images/business_center.png' | asset_url), w=48, q=85, f='auto') }}" alt="Business Center" class="w-4 h-4 object-contain brightness-0 invert" />
            </div>
            <div class="flex flex-col items-start gap-1">
              <span class="text-[10px]" style="color: {{ text_color }};">{{ _('شهادة توثيق التجارة الالكترونية') }}</span>
              <span class="text-xs font-semibold" style="color: {{ heading_color }};">{{ store.settings.contact.business_center }}</span>
            </div>
          </a>
        {% endif %}

        {% if store.settings.general.tax_settings.is_certificate_visible %}
          <a {% if store.settings.general.tax_settings.tax_registration_certificate %}href="{{ store.settings.general.tax_settings.tax_registration_certificate }}" target="_blank" rel="noopener noreferrer"{% endif %} class="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div class="flex items-center justify-center w-8 h-8 rounded-full" style="background-color: {{ icon_bg }}; color: {{ heading_color }};">
              <img src="{{ image_url(('images/vat-certificate.png' | asset_url), w=64, q=85, f='auto') }}" alt="VAT" class="w-4 h-4 object-contain brightness-0 invert" />
            </div>
            <div class="flex flex-col items-start gap-1">
              <span class="text-[10px]" style="color: {{ text_color }};">{{ _('الرقم الضريبي') }}</span>
              {% if store.settings.general.tax_settings.tax_number %}
                <span class="text-xs font-semibold" style="color: {{ heading_color }};">{{ store.settings.general.tax_settings.tax_number }}</span>
              {% endif %}
            </div>
          </a>
        {% endif %}
      </div>

      {# Payment Methods #}
      <div class="flex flex-wrap justify-center md:justify-end items-center gap-2">
        {% for payment_method in store.settings.checkout.payment_methods %}
          <div class="flex items-center justify-center h-8 bg-transparent rounded-md">
            <img src="{{ image_url(payment_method.icon, w=64, h=32, q=100) }}" alt="{{ payment_method.name }}" class="h-6 w-auto object-contain" />
          </div>
        {% endfor %}
        {% for shipping_method in store.settings.checkout.shipping_methods %}
          <div class="flex items-center justify-center h-8 bg-transparent rounded-md">
            <img src="{{ image_url(shipping_method.icon, w=64, h=32, q=100) }}" alt="{{ shipping_method.name }}" class="h-6 w-auto object-contain" />
          </div>
        {% endfor %}
      </div>

    </div>
  {% endif %}

  {# ── Divider ───────────────────────────────────────────────────────────── #}
  <div class="mx-6 md:mx-20" style="border-top: 1px solid {{ divider_color }};"></div>"""

if old_legal in content:
    content = content.replace(old_legal, new_legal)
    with open('footer.jinja', 'w') as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Could not find old_legal block to replace!")
