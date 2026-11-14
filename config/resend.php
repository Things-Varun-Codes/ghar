<?php

return [
    // Ghar sends mail through Resend and listens to none of its webhook events. Left on, the
    // package registers POST /resend/webhook, which answers anyone unless a signing secret is
    // set. The package fills in its other defaults underneath this file.
    'routes' => false,
];
